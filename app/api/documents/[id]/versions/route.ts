import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Document from '../../../../../models/Document';
import DocumentVersion from '../../../../../models/DocumentVersion';
import { getCurrentUser } from '../../../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/documents/[id]/versions
 * List all past versions of a document
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

        const document = await Document.findById(params.id);
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Check access permissions
        const isOwner = document.uploadedBy.toString() === user.id;
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

        const versions = await DocumentVersion.find({ documentId: params.id })
            .populate('uploadedBy', 'name email role department')
            .sort({ version: -1 })
            .lean();

        return NextResponse.json({ versions });
    } catch (error) {
        console.error('Get document versions error:', error);
        return NextResponse.json({
            error: 'Failed to fetch document versions',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * POST /api/documents/[id]/versions
 * Upload a new version for an existing document
 */
export async function POST(
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

        // Check permissions (must have edit permission)
        const isOwner = document.uploadedBy.toString() === user.id;
        const hasEditPermission = document.sharedWith.some(
            (share: any) =>
                (share.userId?.toString() === user.id || share.role === user.role) &&
                share.permissions.includes('edit')
        );

        if (!isOwner && !hasEditPermission) {
            return NextResponse.json({
                error: 'Not authorized to create a new version of this document'
            }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const comment = formData.get('comment') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Snapshot the current document data into DocumentVersion
        // if version 1 doesn't exist yet, we create it.
        await DocumentVersion.create({
            documentId: document._id,
            version: document.version || 1,
            fileName: document.fileName,
            filePath: document.filePath,
            fileSize: document.fileSize,
            fileType: document.fileType,
            mimeType: document.mimeType,
            uploadedBy: document.uploadedBy,
            comment: 'Previous version'
            // We don't have the original comment for older versions, so we put a generic one.
            // Or we can leave it blank.
        });

        // 2. Save the new file
        const department = document.department;
        const uploadDir = path.join(process.cwd(), 'public', 'documents', department);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = path.join(uploadDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const fileSize = buffer.length;
        const fileType = path.extname(file.name).substring(1).toUpperCase() || 'UNKNOWN';
        const mimeType = file.type;

        // 3. Update the Document with new file details and increment version
        document.fileName = fileName;
        document.filePath = `/documents/${department}/${fileName}`;
        document.fileSize = fileSize;
        document.fileType = fileType;
        document.mimeType = mimeType;
        if (formData.get('title')) {
            document.title = formData.get('title') as string;
        }
        // Increment version
        document.version = (document.version || 1) + 1;
        // Update uploader of the *current* state perhaps? The prompt implies preserving history.
        // Changing uploadedBy might be useful or keeping original. We'll leave the original or update to the new uploader.
        // Let's update `uploadedBy` slightly if needed, but usually the creator is the creator.
        // For now we just update the file data.

        await document.save();

        return NextResponse.json({
            success: true,
            document,
            message: 'New version successfully created'
        }, { status: 201 });

    } catch (error) {
        console.error('Create document version error:', error);
        return NextResponse.json({
            error: 'Failed to create new version',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
