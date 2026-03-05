import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createAuditLog } from './audit-service';
import { AuditAction } from '../models/AuditLog';

/**
 * Gmail API Integration Service
 * Handles email monitoring, attachment extraction, and email sending
 */

// Initialize OAuth2 client
function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Gmail API credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    // Gmail scopes
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    // Google Drive scopes
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    // Google Workspace scopes
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Set credentials for OAuth2 client
 */
function setCredentials(oauth2Client: OAuth2Client, accessToken: string, refreshToken?: string) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/**
 * List recent emails
 */
export async function listEmails(
  accessToken: string,
  refreshToken: string,
  maxResults: number = 10,
  query?: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query || 'has:attachment',
  });

  return response.data.messages || [];
}

/**
 * Get email details including attachments
 */
export async function getEmailDetails(
  accessToken: string,
  refreshToken: string,
  messageId: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload?.headers || [];
  
  // Extract email metadata
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  const to = headers.find(h => h.name === 'To')?.value || '';

  // Extract attachments
  const attachments = await extractAttachments(gmail, message);

  return {
    id: messageId,
    subject,
    from,
    to,
    date,
    snippet: message.snippet,
    attachments,
  };
}

/**
 * Extract attachments from email
 */
async function extractAttachments(gmail: any, message: any) {
  const attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
    data?: string;
  }> = [];

  function processParts(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        processParts(part.parts);
      }
    }
  }

  if (message.payload?.parts) {
    processParts(message.payload.parts);
  }

  return attachments;
}

/**
 * Download attachment from email
 */
export async function downloadAttachment(
  accessToken: string,
  refreshToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });

  const data = response.data.data;
  if (!data) {
    throw new Error('No attachment data received');
  }

  // Decode base64url to buffer
  const buffer = Buffer.from(data, 'base64url');
  return buffer;
}

/**
 * Send email with attachment
 */
export async function sendEmail(
  accessToken: string,
  refreshToken: string,
  options: {
    to: string;
    subject: string;
    body: string;
    from?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      mimeType: string;
    }>;
  }
) {
  try {
    const oauth2Client = getOAuth2Client();
    setCredentials(oauth2Client, accessToken, refreshToken);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const message = createEmailMessage(options);

    console.log('[Gmail Service] Sending email to:', options.to);
    console.log('[Gmail Service] Message size:', message.length, 'characters');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: message,
      },
    });

    console.log('[Gmail Service] Email sent successfully. Message ID:', response.data.id);

    return response.data;
  } catch (error: any) {
    console.error('[Gmail Service] Error sending email:', error);
    console.error('[Gmail Service] Error details:', error.response?.data || error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
  });

  return response.data;
}

/**
 * Create RFC 2822 formatted email message
 */
function createEmailMessage(options: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    mimeType: string;
  }>;
}): string {
  const boundary = '----=_Part_' + Date.now();
  const nl = '\r\n';

  let message = [
    options.from ? `From: ${options.from}` : '',
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    options.body,
  ].filter(line => line !== '').join(nl);

  // Add attachments
  if (options.attachments && options.attachments.length > 0) {
    for (const attachment of options.attachments) {
      message += nl + `--${boundary}` + nl;
      message += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"` + nl;
      message += 'Content-Transfer-Encoding: base64' + nl;
      message += `Content-Disposition: attachment; filename="${attachment.filename}"` + nl;
      message += nl;
      message += attachment.content.toString('base64') + nl;
    }
  }

  message += nl + `--${boundary}--`;

  // Encode to base64url
  return Buffer.from(message).toString('base64url');
}

/**
 * Watch for new emails (webhook setup)
 */
export async function watchEmails(
  accessToken: string,
  refreshToken: string,
  topicName: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  });

  return response.data;
}

/**
 * Stop watching emails
 */
export async function stopWatchingEmails(
  accessToken: string,
  refreshToken: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.stop({
    userId: 'me',
  });
}

/**
 * Process email and save attachments to document library
 */
export async function processEmailAttachments(
  accessToken: string,
  refreshToken: string,
  messageId: string,
  userId: string
): Promise<{
  success: boolean;
  documentsCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let documentsCreated = 0;

  try {
    // Get email details
    const email = await getEmailDetails(accessToken, refreshToken, messageId);

    // Process each attachment
    for (const attachment of email.attachments) {
      try {
        // Download attachment
        const buffer = await downloadAttachment(
          accessToken,
          refreshToken,
          messageId,
          attachment.attachmentId
        );

        // Save to document library (implement your document saving logic here)
        // This would integrate with your existing document upload system
        
        // Log the action
        await createAuditLog({
          action: AuditAction.DOCUMENT_UPLOAD,
          userId,
          targetType: 'document',
          details: {
            source: 'gmail',
            emailSubject: email.subject,
            emailFrom: email.from,
            filename: attachment.filename,
            size: attachment.size,
          },
        });

        documentsCreated++;
      } catch (error) {
        errors.push(`Failed to process ${attachment.filename}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      documentsCreated,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      documentsCreated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
