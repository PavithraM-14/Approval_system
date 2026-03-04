import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import ShareLink from '../../../../models/ShareLink';
import Document from '../../../../models/Document';
import { getCurrentUser } from '../../../../lib/auth';
import crypto from 'crypto';

/**
 * POST /api/share/create - Create a shareable link
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      documentId,
      requestAttachment, // { filePath, fileName, requestId }
      expiryHours = 24,
      maxAccessCount = null,
      password = null,
      allowDownload = true,
      watermarkEnabled = true
    } = body;

    // Validate that either documentId or requestAttachment is provided
    if (!documentId && !requestAttachment) {
      return NextResponse.json(
        { error: 'Either documentId or requestAttachment must be provided' },
        { status: 400 }
      );
    }

    // If documentId is provided, verify document exists
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create share link
    const shareLink = await ShareLink.create({
      token,
      documentId: documentId || null,
      requestAttachment: requestAttachment || null,
      createdBy: user.id,
      expiresAt,
      maxAccessCount,
      password,
      allowDownload,
      watermarkEnabled,
      isActive: true
    });

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({
      success: true,
      shareLink: {
        id: shareLink._id,
        url: shareUrl,
        token,
        expiresAt: shareLink.expiresAt,
        allowDownload: shareLink.allowDownload,
        watermarkEnabled: shareLink.watermarkEnabled
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create share link error:', error);
    return NextResponse.json({
      error: 'Failed to create share link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
