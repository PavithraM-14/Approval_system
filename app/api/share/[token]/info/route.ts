import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import ShareLink from '../../../../../models/ShareLink';
import File from '../../../../../models/File';
import Request from '../../../../../models/Request';
import path from 'path';

/**
 * GET /api/share/[token]/info - Get share link information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();
    const { token } = params;

    const shareLink = await ShareLink.findOne({ token })
      .populate('createdBy', 'name email')
      .populate('documentId', 'title fileName fileType');

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Get document name - either from document or from request
    let documentName = shareLink.documentId?.title || shareLink.requestAttachment?.fileName;
    let actualFileName = shareLink.requestAttachment?.fileName;
    
    // If it's a request attachment, fetch the request to get the title
    if (shareLink.requestAttachment?.requestId && !shareLink.documentId) {
      try {
        const requestDoc = await Request.findOne({ requestId: shareLink.requestAttachment.requestId })
          .select('title requestId')
          .lean();
        
        if (requestDoc) {
          documentName = requestDoc.title;
        }
        
        // Check if attachment is a MongoDB file ID
        const attachmentPath = shareLink.requestAttachment.filePath;
        const isMongoId = !attachmentPath.includes('/') && !attachmentPath.includes('\\') && attachmentPath.length === 24;
        
        if (isMongoId) {
          // Fetch actual filename from MongoDB
          try {
            const fileDoc = await File.findById(attachmentPath).select('originalName').lean();
            if (fileDoc) {
              actualFileName = fileDoc.originalName;
            }
          } catch (err) {
            console.error('Error fetching file info:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching request:', err);
      }
    }

    // Check if expired
    const isExpired = new Date() > shareLink.expiresAt;
    const isMaxAccessReached = shareLink.maxAccessCount && shareLink.accessCount >= shareLink.maxAccessCount;

    return NextResponse.json({
      token: shareLink.token,
      fileName: documentName || actualFileName || 'Document',
      fileType: shareLink.documentId?.fileType || path.extname(actualFileName || shareLink.requestAttachment?.fileName || '').substring(1).toUpperCase(),
      createdBy: shareLink.createdBy?.name,
      expiresAt: shareLink.expiresAt,
      isExpired,
      isActive: shareLink.isActive && !isExpired && !isMaxAccessReached,
      accessCount: shareLink.accessCount,
      maxAccessCount: shareLink.maxAccessCount,
      allowDownload: shareLink.allowDownload,
      watermarkEnabled: shareLink.watermarkEnabled,
      requiresPassword: !!shareLink.password
    });
  } catch (error) {
    console.error('Share link info error:', error);
    return NextResponse.json({
      error: 'Failed to get share link info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
