import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { getCurrentUser } from '../../../../lib/auth';
import { 
  listEmails, 
  getEmailDetails, 
  downloadAttachment 
} from '../../../../lib/gmail-service';
import User from '../../../../models/User';
import Document from '../../../../models/Document';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/gmail/import - List emails with attachments
 * POST /api/gmail/import - Import email attachments as documents
 */

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    const query = searchParams.get('query') || 'has:attachment';

    // List emails with attachments
    const emails = await listEmails(
      userDoc.gmailAccessToken,
      userDoc.gmailRefreshToken,
      maxResults,
      query
    );

    // Get details for each email
    const emailDetails = await Promise.all(
      emails.map(async (email) => {
        try {
          const details = await getEmailDetails(
            userDoc.gmailAccessToken!,
            userDoc.gmailRefreshToken!,
            email.id!
          );
          return details;
        } catch (error) {
          console.error(`Failed to get details for email ${email.id}:`, error);
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      emails: emailDetails.filter(e => e !== null),
      count: emailDetails.filter(e => e !== null).length,
    });
  } catch (error) {
    console.error('Error listing Gmail emails:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    const { messageId, attachmentIds, department, category, tags, emailDetails } = body;

    if (!messageId || !attachmentIds || attachmentIds.length === 0) {
      return NextResponse.json(
        { error: 'messageId and attachmentIds are required' },
        { status: 400 }
      );
    }

    // Use provided email details if available, otherwise fetch them
    let email;
    if (emailDetails) {
      console.log('[Gmail Import] Using provided email details');
      email = emailDetails;
    } else {
      console.log('[Gmail Import] Fetching email details from Gmail API');
      email = await getEmailDetails(
        userDoc.gmailAccessToken,
        userDoc.gmailRefreshToken,
        messageId
      );
    }

    console.log('[Gmail Import] Email details:', {
      subject: email.subject,
      attachmentsCount: email.attachments.length,
      attachmentIds: email.attachments.map((a: { attachmentId: string }) => a.attachmentId),
      requestedIds: attachmentIds
    });

    const importedDocuments = [];
    const errors = [];

    console.log('[Gmail Import] Starting import process:', {
      messageId,
      attachmentIdsCount: attachmentIds.length,
      emailSubject: email.subject,
      emailAttachmentsCount: email.attachments.length
    });

    // Process each selected attachment
    for (const attachmentId of attachmentIds) {
      try {
        console.log(`[Gmail Import] Processing attachment: ${attachmentId}`);
        
        const attachment = email.attachments.find((a: { attachmentId: string }) => a.attachmentId === attachmentId);
        if (!attachment) {
          const error = `Attachment ${attachmentId} not found in email`;
          console.error(`[Gmail Import] ${error}`);
          errors.push(error);
          continue;
        }

        console.log(`[Gmail Import] Found attachment:`, {
          filename: attachment.filename,
          size: attachment.size,
          mimeType: attachment.mimeType
        });

        // Download attachment
        console.log(`[Gmail Import] Downloading attachment...`);
        const buffer = await downloadAttachment(
          userDoc.gmailAccessToken,
          userDoc.gmailRefreshToken,
          messageId,
          attachmentId
        );
        console.log(`[Gmail Import] Downloaded ${buffer.length} bytes`);

        // Save file to uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads', 'gmail-imports');
        if (!existsSync(uploadsDir)) {
          console.log(`[Gmail Import] Creating directory: ${uploadsDir}`);
          await mkdir(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${sanitizedFilename}`;
        const filePath = path.join(uploadsDir, filename);

        console.log(`[Gmail Import] Saving file to: ${filePath}`);
        await writeFile(filePath, buffer);
        console.log(`[Gmail Import] File saved successfully`);

        // Create document record
        console.log(`[Gmail Import] Creating document record...`);
        const document = await Document.create({
          title: attachment.filename,
          description: `Imported from email: ${email.subject}`,
          fileName: attachment.filename,
          filePath: `uploads/gmail-imports/${filename}`,
          fileSize: attachment.size,
          fileType: path.extname(attachment.filename).slice(1).toLowerCase(),
          mimeType: attachment.mimeType,
          department: department || user.department || 'General',
          category: 'Other', // Use 'Other' instead of 'Email Import' to match enum
          tags: tags || ['gmail-import', 'email-attachment'],
          keywords: [email.subject, email.from, attachment.filename],
          status: 'active',
          version: 1,
          uploadedBy: user.id,
          sharedWith: [],
          isPublic: false,
          downloadCount: 0,
          viewCount: 0,
        });
        console.log(`[Gmail Import] Document created with ID: ${document._id}`);

        importedDocuments.push({
          id: document._id,
          title: document.title,
          filename: attachment.filename,
          fileName: attachment.filename,
          filePath: `uploads/gmail-imports/${filename}`,
          url: `uploads/gmail-imports/${filename}`,
          size: attachment.size,
        });
        
        console.log(`[Gmail Import] Successfully imported: ${attachment.filename}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Gmail Import] Failed to import attachment ${attachmentId}:`, error);
        errors.push(`${attachmentId}: ${errorMsg}`);
      }
    }

    console.log('[Gmail Import] Import complete:', {
      imported: importedDocuments.length,
      errors: errors.length
    });

    const response = {
      success: importedDocuments.length > 0,
      imported: importedDocuments,
      count: importedDocuments.length,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        totalAttachmentsRequested: attachmentIds.length,
        successfulImports: importedDocuments.length,
        failedImports: errors.length
      }
    };

    console.log('[Gmail Import] Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error importing Gmail attachments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import attachments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
