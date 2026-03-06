import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createAuditLog } from './audit-service';
import { AuditAction } from '../models/AuditLog';

/**
 * Google Drive API Integration Service
 * Handles document storage, editing, and collaboration
 */

// Initialize OAuth2 client
function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google Drive API credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth2 authorization URL
 */
export function getDriveAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
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
export async function getDriveTokensFromCode(code: string) {
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
 * Upload file to Google Drive
 */
export async function uploadToDrive(
  accessToken: string,
  refreshToken: string,
  options: {
    filename: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata: any = {
    name: options.filename,
  };

  if (options.folderId) {
    fileMetadata.parents = [options.folderId];
  }

  const media = {
    mimeType: options.mimeType,
    body: options.content,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, size',
  });

  return response.data;
}

/**
 * Download file from Google Drive
 */
export async function downloadFromDrive(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<Buffer> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get(
    {
      fileId: fileId,
      alt: 'media',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * List files in Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  refreshToken: string,
  options?: {
    folderId?: string;
    pageSize?: number;
    query?: string;
  }
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let query = "trashed = false";
  
  if (options?.folderId) {
    query += ` and '${options.folderId}' in parents`;
  }
  
  if (options?.query) {
    query += ` and ${options.query}`;
  }

  const response = await drive.files.list({
    pageSize: options?.pageSize || 100,
    q: query,
    fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, size, owners)',
  });

  return response.data.files || [];
}

/**
 * Get file metadata
 */
export async function getDriveFileMetadata(
  accessToken: string,
  refreshToken: string,
  fileId: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, size, owners, permissions',
  });

  return response.data;
}

/**
 * Create Google Doc
 */
export async function createGoogleDoc(
  accessToken: string,
  refreshToken: string,
  title: string,
  content?: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const docs = google.docs({ version: 'v1', auth: oauth2Client });

  // Create empty document
  const createResponse = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
    },
    fields: 'id, name, webViewLink',
  });

  const documentId = createResponse.data.id;

  // Add content if provided
  if (content && documentId) {
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: content,
            },
          },
        ],
      },
    });
  }

  return createResponse.data;
}

/**
 * Create Google Sheet
 */
export async function createGoogleSheet(
  accessToken: string,
  refreshToken: string,
  title: string,
  data?: string[][]
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  // Create empty spreadsheet
  const createResponse = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    fields: 'id, name, webViewLink',
  });

  const spreadsheetId = createResponse.data.id;

  // Add data if provided
  if (data && data.length > 0 && spreadsheetId) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: data,
      },
    });
  }

  return createResponse.data;
}

/**
 * Share file with user
 */
export async function shareDriveFile(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  email: string,
  role: 'reader' | 'writer' | 'commenter' = 'reader'
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      type: 'user',
      role: role,
      emailAddress: email,
    },
    sendNotificationEmail: true,
  });

  return response.data;
}

/**
 * Convert Office file to Google format
 */
export async function convertToGoogleFormat(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  targetMimeType: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Get original file
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'name, mimeType',
  });

  // Download original
  const content = await downloadFromDrive(accessToken, refreshToken, fileId);

  // Upload as Google format
  const converted = await drive.files.create({
    requestBody: {
      name: file.data.name,
      mimeType: targetMimeType,
    },
    media: {
      mimeType: file.data.mimeType || 'application/octet-stream',
      body: content,
    },
    fields: 'id, name, mimeType, webViewLink',
  });

  return converted.data;
}

/**
 * Export Google Doc to PDF
 */
export async function exportToPDF(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<Buffer> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.export(
    {
      fileId: fileId,
      mimeType: 'application/pdf',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Create folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  refreshToken: string,
  folderName: string,
  parentFolderId?: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink',
  });

  return response.data;
}

/**
 * Delete file from Google Drive
 */
export async function deleteDriveFile(
  accessToken: string,
  refreshToken: string,
  fileId: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.files.delete({
    fileId: fileId,
  });

  return { success: true };
}

/**
 * Get embed URL for Google Doc/Sheet/Slides
 */
export function getEmbedUrl(fileId: string, type: 'document' | 'spreadsheet' | 'presentation'): string {
  const baseUrls = {
    document: 'https://docs.google.com/document/d/',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/',
    presentation: 'https://docs.google.com/presentation/d/',
  };

  return `${baseUrls[type]}${fileId}/edit`;
}

/**
 * Watch for file changes (webhook)
 */
export async function watchDriveFile(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  webhookUrl: string
) {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.watch({
    fileId: fileId,
    requestBody: {
      id: `watch-${fileId}-${Date.now()}`,
      type: 'web_hook',
      address: webhookUrl,
    },
  });

  return response.data;
}
