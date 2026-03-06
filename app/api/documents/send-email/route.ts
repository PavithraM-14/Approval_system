import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { getCurrentUser } from '../../../../lib/auth';
import { sendEmail } from '../../../../lib/gmail-service';
import User from '../../../../models/User';
import Document from '../../../../models/Document';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * POST /api/documents/send-email - Send document via Gmail
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Gmail tokens
    const userDoc = await User.findById(user.id);
    if (!userDoc?.gmailAccessToken || !userDoc?.gmailRefreshToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { documentId, filePath, to, subject, message } = body;

    if ((!documentId && !filePath) || !to || !subject) {
      return NextResponse.json(
        { error: 'documentId or filePath, to, and subject are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get document or use provided file path
    let document;
    let filePathToUse;
    let fileName;
    let fileSize = 0;
    let mimeType = 'application/octet-stream';
    let fileBuffer: Buffer;

    if (documentId) {
      // Get document from database
      document = await Document.findById(documentId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Check if user has access to document
      const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
      const hasAccess = 
        user.role.isSystemAdmin ||
        document.uploadedBy.toString() === user.id ||
        document.isPublic ||
        document.sharedWith.some((share: any) => 
          share.userId?.toString() === user.id ||
          share.role === userRoleName ||
          share.department === user.department
        );

      if (!hasAccess && user.role.permissions.canCreate) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      filePathToUse = document.filePath;
      fileName = document.fileName;
      fileSize = document.fileSize;
      mimeType = document.mimeType;
    } else if (filePath) {
      // Use provided file path (for request attachments)
      filePathToUse = filePath;
      fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'attachment';
      // Try to determine mime type from extension
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'txt': 'text/plain',
      };
      mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
    }

    // Read file - check if it's a MongoDB ID or file path
    const isMongoId = filePathToUse && !filePathToUse.includes('/') && !filePathToUse.includes('\\') && filePathToUse.length === 24;
    
    if (isMongoId) {
      // File is stored in MongoDB GridFS
      console.log('[Send Email] Reading from GridFS:', filePathToUse);
      const File = (await import('../../../../models/File')).default;
      const fileDoc = await File.findById(filePathToUse);
      
      if (!fileDoc) {
        return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
      }
      
      fileBuffer = fileDoc.data;
      fileName = fileDoc.originalName;
      mimeType = fileDoc.mimeType;
      fileSize = fileDoc.size;
    } else {
      // File is on filesystem
      console.log('[Send Email] Reading from filesystem:', filePathToUse);
      
      // Check if file path starts with 'uploads/' (not in public folder)
      let fullPath;
      if (filePathToUse.startsWith('uploads/')) {
        fullPath = path.join(process.cwd(), filePathToUse);
      } else {
        const cleanPath = filePathToUse.startsWith('/') ? filePathToUse.substring(1) : filePathToUse;
        fullPath = path.join(process.cwd(), 'public', cleanPath);
      }
      
      fileBuffer = await readFile(fullPath);
      if (fileBuffer.length > 0) {
        fileSize = fileBuffer.length;
      }
    }

    // Prepare email body
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              Document Shared from S.E.A.D.
            </h2>
            
            <p>Hello,</p>
            
            <p>${message || `${user.name} has shared a document with you.`}</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Document Details:</h3>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${document?.title || fileName}</p>
              <p style="margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
              <p style="margin: 5px 0;"><strong>Size:</strong> ${(fileSize / 1024).toFixed(2)} KB</p>
              ${document?.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${document.description}</p>` : ''}
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This document was sent from the S.E.A.D. Document Management System.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Sent by: ${user.name} (${user.email})
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Gmail
    console.log('[Send Email] Attempting to send email to:', to);
    console.log('[Send Email] Subject:', subject);
    console.log('[Send Email] Attachment:', fileName, 'Size:', fileSize);
    
    const result = await sendEmail(
      userDoc.gmailAccessToken,
      userDoc.gmailRefreshToken,
      {
        from: user.email,
        to,
        subject,
        body: emailBody,
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
            mimeType: mimeType,
          },
        ],
      }
    );

    console.log('[Send Email] Gmail API response:', result);

    return NextResponse.json({
      success: true,
      message: 'Document sent successfully',
      sentTo: to,
      messageId: result.id,
      document: {
        id: document?._id,
        title: document?.title || fileName,
        filename: fileName,
      },
    });
  } catch (error) {
    console.error('Error sending document via email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
