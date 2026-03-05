import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Document from '../../../models/Document';
import Request from '../../../models/Request';
import Folder from '../../../models/Folder';
import { getCurrentUser } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

/**
 * GET /api/documents - List documents with filtering and search
 * Includes both standalone documents AND request attachments
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Filters
    const department = searchParams.get('department');
    const project = searchParams.get('project');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    const includeRequestAttachments = searchParams.get('includeRequestAttachments') !== 'false'; // Default true

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build query for standalone documents
    let query: any = { status };

    // Access control for standalone documents
    if (user.role === 'requester') {
      query.$or = [
        { uploadedBy: user.id },
        { isPublic: true },
        { 'sharedWith.userId': user.id },
        { 'sharedWith.role': user.role },
        { 'sharedWith.department': user.department }
      ];
    } else {
      query.$or = [
        { isPublic: true },
        { 'sharedWith.role': user.role },
        { 'sharedWith.department': user.department },
        { uploadedBy: user.id }
      ];
    }

    // Apply filters
    if (department) query.department = department;
    if (project) query.project = project;
    if (category) query.category = category;
    if (tags && tags.length > 0) query.tags = { $in: tags };
    if (folderId) query.parentFolder = folderId;

    // Full-text search
    if (search) {
      query.$text = { $search: search };
    }

    // Fetch standalone documents
    const documents = await Document.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .populate('uploadedBy', 'name email role department')
      .populate('parentFolder', 'name path')
      .lean();

    let allDocuments = [...documents];

    // Fetch request attachments if enabled
    if (includeRequestAttachments) {
      const requestQuery: any = {
        attachments: { $exists: true, $ne: [] }
      };

      // Apply department filter to requests
      if (department) requestQuery.department = department;

      const requests = await Request.find(requestQuery)
        .populate('requester', 'name email role department')
        .select('_id requestId title department expenseCategory attachments requester createdAt status')
        .lean();

      // Transform request attachments into document format
      const requestAttachments = await Promise.all(
        requests.flatMap(async (req: any) => {
          return Promise.all(
            req.attachments.map(async (fileId: string) => {
              // Fetch file metadata to get original filename and MIME type
              let fileName = fileId;
              let fileExt = 'UNKNOWN';
              let mimeType = 'application/octet-stream';

              try {
                // Try to find the file document
                const File = mongoose.model('File');
                const fileDoc = await File.findById(fileId).lean() as any;

                if (fileDoc) {
                  fileName = fileDoc.originalName;
                  mimeType = fileDoc.mimeType;
                  // Extract extension from originalName
                  const ext = path.extname(fileName).substring(1);
                  fileExt = ext.toUpperCase() || 'UNKNOWN';
                } else {
                  // Fallback if file document not found
                  fileExt = 'UNKNOWN';
                }
              } catch (error) {
                console.error(`Failed to fetch file metadata for ${fileId}:`, error);
                fileExt = 'UNKNOWN';
              }

              return {
                _id: `req_${req._id}_${fileId}`,
                title: req.title, // Use request title as document name
                description: `Attachment from Request #${req.requestId}`,
                fileName: fileName,
                filePath: fileId,
                fileSize: 0, // Unknown for request attachments
                fileType: fileExt,
                mimeType: mimeType,
                department: req.department,
                category: req.expenseCategory || 'Other', // Use request's expense category
                tags: ['request', req.requestId],
                status: 'active',
                uploadedBy: req.requester,
                createdAt: req.createdAt,
                downloadCount: 0,
                viewCount: 0,
                isRequestAttachment: true,
                requestId: req.requestId,
                requestMongoId: req._id, // Add MongoDB _id for routing
                requestStatus: req.status
              };
            })
          );
        })
      );

      allDocuments = [...allDocuments, ...requestAttachments.flat()];
    }

    // Apply search filter to combined results if needed
    if (search) {
      const searchLower = search.toLowerCase();
      allDocuments = allDocuments.filter(doc =>
        doc.title?.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.fileName?.toLowerCase().includes(searchLower) ||
        doc.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
        doc.category?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    allDocuments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const total = allDocuments.length;
    const paginatedDocuments = allDocuments.slice(skip, skip + limit);

    return NextResponse.json({
      documents: paginatedDocuments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/documents - Upload a new document
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract metadata
    const title = formData.get('title') as string || file.name;
    const description = formData.get('description') as string;
    const department = formData.get('department') as string || user.department;
    const project = formData.get('project') as string;
    const category = formData.get('category') as string || 'Other';
    const tags = formData.get('tags') ? (formData.get('tags') as string).split(',').map(t => t.trim()) : [];
    const keywords = formData.get('keywords') ? (formData.get('keywords') as string).split(',').map(k => k.trim()) : [];
    const folderId = formData.get('folderId') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const sharedWith = formData.get('sharedWith') ? JSON.parse(formData.get('sharedWith') as string) : [];

    // Validate required fields
    if (!department) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    // Create upload directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'documents', department);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get file info
    const fileSize = buffer.length;
    const fileType = path.extname(file.name).substring(1).toUpperCase() || 'UNKNOWN';
    const mimeType = file.type;

    // Create document record
    const document = await Document.create({
      title,
      description,
      fileName,
      filePath: `/documents/${department}/${fileName}`,
      fileSize,
      fileType,
      mimeType,
      department,
      project,
      category,
      tags,
      keywords,
      uploadedBy: user.id,
      sharedWith,
      isPublic,
      parentFolder: folderId || null,
      status: 'active',
      version: 1,
      downloadCount: 0,
      viewCount: 0
    });

    const populatedDocument = await Document.findById(document._id)
      .populate('uploadedBy', 'name email role department')
      .populate('parentFolder', 'name path');

    return NextResponse.json({
      success: true,
      document: populatedDocument
    }, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({
      error: 'Failed to upload document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/documents?id={documentId} - Delete a document
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await Document.findById(documentId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = document.uploadedBy.toString() === user.id;
    const hasDeletePermission = document.sharedWith.some(
      (share: any) =>
        (share.userId?.toString() === user.id || share.role === user.role) &&
        share.permissions.includes('delete')
    );

    if (!isOwner && !hasDeletePermission) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 });
    }

    // Soft delete
    await Document.findByIdAndUpdate(documentId, { status: 'deleted' });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
