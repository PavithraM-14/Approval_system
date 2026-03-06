import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import File from '../../../models/File';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { 
  applyPdfWatermark, 
  convertOfficeToPdfWithWatermark, 
  supportsWatermark, 
  isOfficeDocument 
} from '../../../lib/watermark';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const fileParam = searchParams.get('file');
    const watermark = searchParams.get('watermark') === 'true';
    
    if (!fileParam) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

    let fileBuffer: Buffer;
    let fileName: string;
    let fileExt: string;

    // Check if it's a MongoDB ObjectId or a file path
    if (mongoose.Types.ObjectId.isValid(fileParam) && fileParam.length === 24) {
      // Handle MongoDB file
      const fileDoc = await File.findById(fileParam);

      if (!fileDoc) {
        return NextResponse.json(
          { error: 'File not found in database' },
          { status: 404 }
        );
      }

      console.log('👁️ File view (MongoDB):', {
        fileId: fileDoc._id,
        filename: fileDoc.originalName,
        size: fileDoc.size,
        mimeType: fileDoc.mimeType
      });

      fileBuffer = fileDoc.data;
      fileName = fileDoc.originalName;
      fileExt = path.extname(fileName).toLowerCase();
    } else {
      // Handle filesystem file
      const cleanPath = fileParam.startsWith('/') ? fileParam.substring(1) : fileParam;
      
      // Normalize path separators for Windows
      const normalizedPath = cleanPath.replace(/\\/g, '/');
      
      // Check if file path starts with 'uploads/' (not in public folder)
      let filePath;
      if (normalizedPath.startsWith('uploads/')) {
        // File is in uploads directory (e.g., gmail-imports)
        filePath = path.join(process.cwd(), normalizedPath);
        console.log('📁 Using uploads path:', { normalizedPath, filePath });
      } else {
        // File is in public directory
        filePath = path.join(process.cwd(), 'public', normalizedPath);
        console.log('📁 Using public path:', { normalizedPath, filePath });
      }

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: 'File not found on filesystem', path: filePath, originalParam: fileParam, cleanPath, normalizedPath },
          { status: 404 }
        );
      }

      fileBuffer = await readFile(filePath);
      fileName = path.basename(filePath);
      fileExt = path.extname(fileName).toLowerCase();

      console.log('👁️ File view (filesystem):', {
        path: cleanPath,
        filename: fileName,
        size: fileBuffer.length
      });
    }

    // Convert Office documents to PDF for viewing
    if (isOfficeDocument(fileExt)) {
      try {
        console.log('🔄 Converting Office document to PDF:', fileName);
        
        if (watermark) {
          // Convert with watermark
          fileBuffer = await convertOfficeToPdfWithWatermark(fileBuffer, fileName, fileExt);
        } else {
          // Convert without watermark (just convert to PDF)
          const { convertOfficeToPdf } = await import('../../../lib/watermark');
          fileBuffer = await convertOfficeToPdf(fileBuffer, fileName, fileExt);
        }
        
        // Update filename and extension
        fileName = fileName.replace(fileExt, '.pdf');
        fileExt = '.pdf';
        
        console.log('✅ Conversion successful');
      } catch (error) {
        console.error('❌ Office conversion failed:', error);
        // Fall back to original file
      }
    } else if (watermark && fileExt === '.pdf') {
      // Apply watermark to PDF if requested
      try {
        fileBuffer = await applyPdfWatermark(fileBuffer);
      } catch (error) {
        console.error('❌ PDF watermark failed:', error);
        // Fall back to original file
      }
    }

    // Determine content type
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
    };

    const contentType = contentTypes[fileExt] || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
    });

  } catch (error) {
    console.error('File view error:', error);
    return NextResponse.json(
      { error: 'Failed to view file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
