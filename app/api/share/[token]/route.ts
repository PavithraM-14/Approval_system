import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import ShareLink from '../../../../models/ShareLink';
import Document from '../../../../models/Document';
import File from '../../../../models/File';
import { readFile } from 'fs/promises';
import path from 'path';
import { 
  applyPdfWatermark, 
  convertOfficeToPdfWithWatermark, 
  supportsWatermark, 
  isOfficeDocument 
} from '../../../../lib/watermark';

/**
 * GET /api/share/[token] - Access shared document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();
    const { token } = params;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'view';
    const password = searchParams.get('password');

    // Find share link
    const shareLink = await ShareLink.findOne({ token }).populate('createdBy', 'name email');

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if link is valid
    if (!shareLink.isValid()) {
      if (new Date() > shareLink.expiresAt) {
        return NextResponse.json({ error: 'This link has expired.' }, { status: 410 });
      }
      if (shareLink.maxAccessCount && shareLink.accessCount >= shareLink.maxAccessCount) {
        return NextResponse.json({ error: 'Maximum access count reached' }, { status: 403 });
      }
      return NextResponse.json({ error: 'This link is no longer active' }, { status: 403 });
    }

    // Check password if required
    if (shareLink.password && shareLink.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Check download permission
    if (action === 'download' && !shareLink.allowDownload) {
      return NextResponse.json({ error: 'Download not allowed for this link' }, { status: 403 });
    }

    // Log access
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await shareLink.logAccess(ipAddress, userAgent);

    // Get file path
    let filePath: string;
    let fileName: string;
    let fileBuffer: Buffer;

    if (shareLink.documentId) {
      const document = await Document.findById(shareLink.documentId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      // Check if file path starts with 'uploads/' (not in public folder)
      if (document.filePath.startsWith('uploads/')) {
        // File is in uploads directory (e.g., gmail-imports)
        filePath = path.join(process.cwd(), document.filePath);
      } else {
        // File is in public directory
        const cleanPath = document.filePath.startsWith('/') ? document.filePath.substring(1) : document.filePath;
        filePath = path.join(process.cwd(), 'public', cleanPath);
      }
      
      fileName = document.fileName;
      fileBuffer = await readFile(filePath);
    } else if (shareLink.requestAttachment) {
      const attachmentPath = shareLink.requestAttachment.filePath;
      fileName = shareLink.requestAttachment.fileName;
      
      // Check if this is a MongoDB file ID (no slashes, looks like hex)
      const isMongoId = !attachmentPath.includes('/') && !attachmentPath.includes('\\') && attachmentPath.length === 24;
      
      if (isMongoId) {
        // File is stored in MongoDB
        try {
          const fileDoc = await File.findById(attachmentPath);
          
          if (!fileDoc) {
            return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
          }
          
          fileBuffer = fileDoc.data;
          fileName = fileDoc.originalName;
        } catch (err) {
          console.error('Error fetching file from MongoDB:', err);
          return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
        }
      } else {
        // File is on filesystem
        const cleanPath = attachmentPath.startsWith('/') 
          ? attachmentPath.substring(1) 
          : attachmentPath;
        filePath = path.join(process.cwd(), 'public', cleanPath);
        fileBuffer = await readFile(filePath);
      }
    } else {
      return NextResponse.json({ error: 'Invalid share link configuration' }, { status: 500 });
    }
    const fileExt = path.extname(fileName).toLowerCase();

    // Apply watermark if enabled and convert Office documents to PDF
    if (shareLink.watermarkEnabled && supportsWatermark(fileExt)) {
      try {
        let watermarkedBuffer: Buffer;
        let outputFileName = fileName;
        let contentType = 'application/pdf';

        if (fileExt === '.pdf') {
          // Apply watermark directly to PDF
          watermarkedBuffer = await applyPdfWatermark(fileBuffer);
        } else if (isOfficeDocument(fileExt)) {
          // Convert Office document to PDF with watermark
          watermarkedBuffer = await convertOfficeToPdfWithWatermark(fileBuffer, fileName, fileExt);
          // Change filename to .pdf
          outputFileName = fileName.replace(fileExt, '.pdf');
        } else {
          throw new Error('Unsupported file type for watermarking');
        }
        
        // Always use inline disposition to open in browser
        return new NextResponse(watermarkedBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${outputFileName}"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Watermarked': 'true',
            'X-Original-Type': fileExt
          }
        });
      } catch (error) {
        console.error('Watermark error:', error);
        // Fall back to original file if watermarking fails
      }
    }

    // Return file without watermark (always inline, never download)
    const contentType = getContentType(fileExt);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Share link access error:', error);
    return NextResponse.json({
      error: 'Failed to access shared document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(ext: string): string {
  const types: { [key: string]: string } = {
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
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.zip': 'application/zip'
  };
  return types[ext] || 'application/octet-stream';
}
