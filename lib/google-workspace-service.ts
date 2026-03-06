/**
 * Google Workspace Integration Service
 * Handles conversion and collaborative editing of Office documents
 * - Word → Google Docs
 * - Excel → Google Sheets
 * - PowerPoint → Google Slides
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Initialize OAuth2 client
function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google Workspace API credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function setCredentials(oauth2Client: OAuth2Client, accessToken: string, refreshToken?: string) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/**
 * MIME type mappings for conversion
 */
const MIME_TYPE_MAPPINGS = {
  // Word to Google Docs
  'application/msword': 'application/vnd.google-apps.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.google-apps.document',
  
  // Excel to Google Sheets
  'application/vnd.ms-excel': 'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.google-apps.spreadsheet',
  
  // PowerPoint to Google Slides
  'application/vnd.ms-powerpoint': 'application/vnd.google-apps.presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.google-apps.presentation',
};

/**
 * Check if a file type can be converted to Google Workspace format
 */
export function isConvertibleToGoogleFormat(mimeType: string): boolean {
  return Object.keys(MIME_TYPE_MAPPINGS).includes(mimeType);
}

/**
 * Get the Google Workspace MIME type for a given Office file type
 */
export function getGoogleMimeType(officeMimeType: string): string | null {
  return MIME_TYPE_MAPPINGS[officeMimeType as keyof typeof MIME_TYPE_MAPPINGS] || null;
}

/**
 * Upload and convert Office document to Google Workspace format
 */
export async function uploadAndConvertToGoogle(
  accessToken: string,
  refreshToken: string,
  fileBuffer: Buffer,
  originalFilename: string,
  originalMimeType: string,
  folderId?: string
): Promise<{
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  type: 'document' | 'spreadsheet' | 'presentation';
}> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Get target Google MIME type
  const googleMimeType = getGoogleMimeType(originalMimeType);
  if (!googleMimeType) {
    throw new Error(`Cannot convert ${originalMimeType} to Google format`);
  }

  // Prepare file metadata
  const fileMetadata: any = {
    name: originalFilename,
    mimeType: googleMimeType,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  // Convert Buffer to Stream for googleapis
  const { Readable } = require('stream');
  const stream = Readable.from(fileBuffer);

  // Upload and convert
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: originalMimeType,
      body: stream,
    },
    fields: 'id, name, mimeType, webViewLink, webContentLink',
  });

  // Determine document type
  let type: 'document' | 'spreadsheet' | 'presentation';
  if (googleMimeType.includes('document')) {
    type = 'document';
  } else if (googleMimeType.includes('spreadsheet')) {
    type = 'spreadsheet';
  } else {
    type = 'presentation';
  }

  return {
    fileId: response.data.id!,
    name: response.data.name!,
    mimeType: response.data.mimeType!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink,
    type,
  };
}

/**
 * Share Google Workspace document with users
 */
export async function shareGoogleDocument(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  emails: string[],
  role: 'reader' | 'writer' | 'commenter' = 'writer'
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Share with each email
  for (const email of emails) {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: 'user',
        role: role,
        emailAddress: email,
      },
      sendNotificationEmail: true,
    });
  }
}

/**
 * Make Google Workspace document accessible to anyone with the link
 */
export async function makeGoogleDocumentPublic(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  role: 'reader' | 'writer' | 'commenter' = 'writer'
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      type: 'anyone',
      role: role,
    },
  });
}

/**
 * Get embed URL for Google Workspace document
 */
export function getGoogleDocumentEmbedUrl(
  fileId: string,
  type: 'document' | 'spreadsheet' | 'presentation'
): string {
  const baseUrls = {
    document: 'https://docs.google.com/document/d/',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/',
    presentation: 'https://docs.google.com/presentation/d/',
  };

  return `${baseUrls[type]}${fileId}/edit`;
}

/**
 * Export Google Workspace document back to Office format
 */
export async function exportToOfficeFormat(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  type: 'document' | 'spreadsheet' | 'presentation'
): Promise<Buffer> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Export MIME types
  const exportMimeTypes = {
    document: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    spreadsheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    presentation: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  const response = await drive.files.export(
    {
      fileId: fileId,
      mimeType: exportMimeTypes[type],
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Get document metadata and permissions
 */
export async function getGoogleDocumentInfo(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  owners: any[];
  permissions: any[];
  modifiedTime: string;
}> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, webViewLink, owners, permissions, modifiedTime',
  });

  return response.data as any;
}

/**
 * Delete Google Workspace document
 */
export async function deleteGoogleDocument(
  accessToken: string,
  refreshToken: string,
  fileId: string
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  setCredentials(oauth2Client, accessToken, refreshToken);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.files.delete({
    fileId: fileId,
  });
}

/**
 * Create a folder in Google Drive for organizing documents
 */
export async function createGoogleDriveFolder(
  accessToken: string,
  refreshToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
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
    fields: 'id',
  });

  return response.data.id!;
}
