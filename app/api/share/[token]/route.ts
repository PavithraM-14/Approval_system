import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import ShareLink from '../../../../models/ShareLink';
import Document from '../../../../models/Document';
import File from '../../../../models/File';
import { readFile } from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
      // Remove leading slash if present to avoid double slashes
      const cleanPath = document.filePath.startsWith('/') ? document.filePath.substring(1) : document.filePath;
      filePath = path.join(process.cwd(), 'public', cleanPath);
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

    // Apply watermark if enabled and file is PDF (for both view and download)
    if (shareLink.watermarkEnabled && fileExt === '.pdf') {
      try {
        const watermarkedPdf = await applyWatermark(fileBuffer);
        
        const disposition = action === 'download' ? 'attachment' : 'inline';
        
        return new NextResponse(watermarkedPdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `${disposition}; filename="${fileName}"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Watermarked': 'true'
          }
        });
      } catch (error) {
        console.error('Watermark error:', error);
        // Fall back to original file if watermarking fails
      }
    }

    // Return file without watermark
    const contentType = getContentType(fileExt);
    const disposition = action === 'download' ? 'attachment' : 'inline';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
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
 * Apply watermark to PDF
 */
async function applyWatermark(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const now = new Date();
  const dateStr = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Main watermark text - LARGER and MORE VISIBLE
    const mainText = 'S.E.A.D.';
    const dateText = `Accessed: ${dateStr}`;
    
    const mainFontSize = 100; // Increased from 60 to 100
    const dateFontSize = 20;  // Increased from 12 to 20
    
    // Calculate center position
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate text width for centering
    const mainTextWidth = font.widthOfTextAtSize(mainText, mainFontSize);
    const dateTextWidth = font.widthOfTextAtSize(dateText, dateFontSize);
    
    // Draw main watermark (S.E.A.D.) in center at 45-degree angle
    // More visible with darker color and higher opacity
    page.drawText(mainText, {
      x: centerX - mainTextWidth / 2,
      y: centerY,
      size: mainFontSize,
      font: font,
      color: rgb(0.7, 0.7, 0.7), // Darker gray (was 0.85)
      opacity: 0.5, // Higher opacity (was 0.3)
      rotate: {
        angle: 45, // 45-degree slant
        type: 'degrees'
      }
    });
    
    // Draw date text below main text (also slanted)
    page.drawText(dateText, {
      x: centerX - dateTextWidth / 2,
      y: centerY - 60, // Adjusted spacing
      size: dateFontSize,
      font: font,
      color: rgb(0.65, 0.65, 0.65), // Darker gray (was 0.75)
      opacity: 0.5, // Higher opacity (was 0.3)
      rotate: {
        angle: 45, // Same angle as main text
        type: 'degrees'
      }
    });
  }

  const watermarkedPdfBytes = await pdfDoc.save();
  return Buffer.from(watermarkedPdfBytes);
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
