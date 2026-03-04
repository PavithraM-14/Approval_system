import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import {
  uploadAndConvertToGoogle,
  makeGoogleDocumentPublic,
  getGoogleDocumentEmbedUrl,
} from '../../../../lib/google-workspace-service';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import File from '../../../../models/File';

/**
 * Convert Office document to Google Workspace format for collaborative editing
 * POST /api/documents/convert
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await request.json();

    console.log('[CONVERT] Request received:', { fileId, userId: user.id });

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    await connectDB();

    // Get file from database
    const file = await File.findById(fileId);
    if (!file) {
      console.error('[CONVERT] File not found:', fileId);
      return NextResponse.json({ error: 'File not found', details: `No file with ID: ${fileId}` }, { status: 404 });
    }

    if (!file.data) {
      console.error('[CONVERT] File data is missing:', fileId);
      return NextResponse.json({ error: 'File data is missing', details: 'File exists but has no data buffer' }, { status: 400 });
    }

    console.log('[CONVERT] File found:', {
      filename: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      hasData: !!file.data,
    });

    // Check if file is already converted
    if (file.googleFileId) {
      console.log('[CONVERT] File already converted:', file.googleFileId);
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        googleFileId: file.googleFileId,
        googleFileType: file.googleFileType,
        editUrl: getGoogleDocumentEmbedUrl(file.googleFileId, file.googleFileType),
      });
    }

    // Get user's Google credentials
    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      console.error('[CONVERT] User document not found:', user.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }
    
    if (!userDoc.gmailAccessToken) {
      console.error('[CONVERT] User Google account not connected:', user.id);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google account first.' },
        { status: 400 }
      );
    }

    console.log('[CONVERT] Starting conversion to Google format...');

    // Convert and upload to Google Drive
    let result;
    try {
      result = await uploadAndConvertToGoogle(
        userDoc.gmailAccessToken,
        userDoc.gmailRefreshToken,
        file.data,
        file.originalName,
        file.mimeType
      );
    } catch (uploadError) {
      console.error('[CONVERT] Upload/conversion failed:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      return NextResponse.json(
        { error: 'Failed to convert document to Google format', details: errorMessage },
        { status: 400 }
      );
    }

    console.log('[CONVERT] Conversion successful:', {
      googleFileId: result.fileId,
      type: result.type,
    });

    // Make document editable by anyone with the link
    try {
      await makeGoogleDocumentPublic(
        userDoc.gmailAccessToken,
        userDoc.gmailRefreshToken,
        result.fileId,
        'writer'
      );
    } catch (shareError) {
      console.error('[CONVERT] Failed to make document public:', shareError);
      // Don't return error here - document is created but not shared
    }

    console.log('[CONVERT] Document made public');

    // Update file record with Google file info
    try {
      file.googleFileId = result.fileId;
      file.googleFileType = result.type;
      file.googleWebViewLink = result.webViewLink;
      await file.save();
    } catch (saveError) {
      console.error('[CONVERT] Failed to save file record:', saveError);
      // Don't fail - the conversion succeeded even if we can't save the metadata
      console.warn('[CONVERT] Continuing without saving file metadata update');
    }

    console.log('[CONVERT] File record updated');

    return NextResponse.json({
      success: true,
      googleFileId: result.fileId,
      googleFileType: result.type,
      editUrl: getGoogleDocumentEmbedUrl(result.fileId, result.type),
      viewUrl: result.webViewLink,
    });
  } catch (error) {
    console.error('[CONVERT] Error:', error);
    console.error('[CONVERT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to convert document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
