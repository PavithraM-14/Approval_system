import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Document from '../../../../models/Document';
import { getCurrentUser } from '../../../../lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * GET /api/documents/[id] - Get document details or download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action'); // 'view' or 'download'

    const document = await Document.findById(params.id)
      .populate('uploadedBy', 'name email role department')
      .populate('parentFolder', 'name path');

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access permissions
    const isOwner = document.uploadedBy._id.toString() === user.id;
    const isPublic = document.isPublic;
    const hasAccess = document.sharedWith.some(
      (share: any) => 
        share.userId?.toString() === user.id ||
        share.role === user.role ||
        share.department === user.department
    );

    if (!isOwner && !isPublic && !hasAccess) {
      return NextResponse.json({ 
        error: 'Not authorized to access this document' 
      }, { status: 403 });
    }

    // If action is download or view, serve the file
    if (action === 'download' || action === 'view') {
      try {
        // Check if file path starts with 'uploads/' (not in public folder)
        let filePath;
        if (document.filePath.startsWith('uploads/')) {
          // File is in uploads directory (e.g., gmail-imports)
          filePath = path.join(process.cwd(), document.filePath);
        } else {
          // File is in public directory
          filePath = path.join(process.cwd(), 'public', document.filePath);
        }
        
        const fileBuffer = await readFile(filePath);

        // Update download count for downloads, view count for views
        if (action === 'download') {
          await Document.findByIdAndUpdate(params.id, {
            $inc: { downloadCount: 1 },
            lastAccessedAt: new Date()
          });
        } else {
          await Document.findByIdAndUpdate(params.id, {
            $inc: { viewCount: 1 },
            lastAccessedAt: new Date()
          });
        }

        const disposition = action === 'download' 
          ? `attachment; filename="${document.fileName}"`
          : `inline; filename="${document.fileName}"`;

        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': disposition,
            'Content-Length': document.fileSize.toString()
          }
        });
      } catch (error) {
        console.error('File read error:', error);
        return NextResponse.json({ 
          error: 'Failed to read file',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Otherwise, return document metadata
    // Update view count
    await Document.findByIdAndUpdate(params.id, {
      $inc: { viewCount: 1 },
      lastAccessedAt: new Date()
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({
      error: 'Failed to fetch document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/documents/[id] - Update document metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await Document.findById(params.id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = document.uploadedBy.toString() === user.id;
    const hasEditPermission = document.sharedWith.some(
      (share: any) => 
        (share.userId?.toString() === user.id || share.role === user.role) &&
        share.permissions.includes('edit')
    );

    if (!isOwner && !hasEditPermission) {
      return NextResponse.json({ 
        error: 'Not authorized to edit this document' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, tags, keywords, category, status, isPublic, sharedWith } = body;

    // Update document
    const updatedDocument = await Document.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(tags && { tags }),
          ...(keywords && { keywords }),
          ...(category && { category }),
          ...(status && { status }),
          ...(isPublic !== undefined && { isPublic }),
          ...(sharedWith && { sharedWith })
        }
      },
      { new: true }
    )
      .populate('uploadedBy', 'name email role department')
      .populate('parentFolder', 'name path');

    return NextResponse.json({
      success: true,
      document: updatedDocument
    });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({
      error: 'Failed to update document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
