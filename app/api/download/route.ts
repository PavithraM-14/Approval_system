import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import File from '../../../models/File';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const fileParam = searchParams.get('file');
    
    if (!fileParam) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

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

      console.log('📥 File download (MongoDB):', {
        fileId: fileDoc._id,
        filename: fileDoc.originalName,
        size: fileDoc.size,
        mimeType: fileDoc.mimeType
      });

      return new Response(fileDoc.data, {
        headers: {
          'Content-Type': fileDoc.mimeType,
          'Content-Disposition': `attachment; filename="${fileDoc.originalName}"`,
          'Content-Length': fileDoc.size.toString(),
        },
      });
    } else {
      // Handle filesystem file
      const cleanPath = fileParam.startsWith('/') ? fileParam.substring(1) : fileParam;
      const filePath = path.join(process.cwd(), 'public', cleanPath);

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: 'File not found on filesystem', path: filePath },
          { status: 404 }
        );
      }

      const fileBuffer = await readFile(filePath);
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName).toLowerCase();

      // Determine content type
      const contentTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
      };

      const contentType = contentTypes[fileExt] || 'application/octet-stream';

      console.log('📥 File download (filesystem):', {
        path: cleanPath,
        filename: fileName,
        size: fileBuffer.length,
        contentType
      });

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
