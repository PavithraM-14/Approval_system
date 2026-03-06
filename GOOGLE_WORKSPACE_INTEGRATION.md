# Google Workspace Integration Guide

## Overview

This system integrates with Google Workspace APIs to enable collaborative editing of Office documents directly in the browser:

- **Word documents (.doc, .docx)** → Google Docs
- **Excel spreadsheets (.xls, .xlsx)** → Google Sheets  
- **PowerPoint presentations (.ppt, .pptx)** → Google Slides

## How It Works

### 1. Document Upload
Users upload Office documents when creating requests. Files are stored in MongoDB.

### 2. Conversion to Google Format
When a user clicks "Edit Online":
1. System uploads the file to Google Drive
2. Google Drive automatically converts it to the appropriate format:
   - Word → Google Docs
   - Excel → Google Sheets
   - PowerPoint → Google Slides
3. Document is made editable by anyone with the link
4. Edit URL is generated and stored

### 3. Collaborative Editing
- Users can edit documents in real-time
- Multiple users can collaborate simultaneously
- All Google Workspace features available (comments, suggestions, version history)
- Changes are saved automatically to Google Drive

### 4. Export Back to Office Format
Documents can be exported back to original Office format if needed.

## Setup Instructions

### Prerequisites

You need Google Cloud credentials with the following APIs enabled:
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API

### Step 1: Enable APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" → "Library"
4. Enable the following APIs:
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Slides API

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in application details:
   - App name: "SEAD Approval System"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/presentations`
5. Add test users (your email addresses)

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "SEAD Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3000/api/gmail/callback`
   - `http://localhost:3000/api/google-drive/callback`
   - Add your production URLs when deploying
6. Click "Create"
7. Copy the Client ID and Client Secret

### Step 4: Update Environment Variables

Add to your `.env.local`:

```env
# Google Workspace Integration
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# Or use the same credentials as Gmail (they can be shared)
GMAIL_CLIENT_ID=your-client-id-here
GMAIL_CLIENT_SECRET=your-client-secret-here
```

### Step 5: Connect Google Account

1. Start your development server: `npm run dev`
2. Login to the system
3. Visit: `http://localhost:3000/api/gmail/auth`
4. Copy the `authUrl` from the response
5. Open that URL in your browser
6. Sign in with your Google account
7. Grant the requested permissions
8. You'll be redirected back to the dashboard

## Usage

### For End Users

1. **Upload Documents**: When creating a request, upload Word, Excel, or PowerPoint files
2. **View Request**: Navigate to the request details page
3. **Edit Online**: Click the "Edit Online" button next to any Office document
4. **Collaborate**: The document opens in Google Docs/Sheets/Slides where you can:
   - Edit in real-time
   - Add comments
   - Suggest changes
   - View version history
   - Share with others
5. **Auto-Save**: All changes are automatically saved to Google Drive

### For Developers

#### Convert a Document

```typescript
import { uploadAndConvertToGoogle } from '@/lib/google-workspace-service';

const result = await uploadAndConvertToGoogle(
  accessToken,
  refreshToken,
  fileBuffer,
  'document.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
);

console.log('Edit URL:', result.webViewLink);
```

#### Share with Specific Users

```typescript
import { shareGoogleDocument } from '@/lib/google-workspace-service';

await shareGoogleDocument(
  accessToken,
  refreshToken,
  fileId,
  ['user1@example.com', 'user2@example.com'],
  'writer' // or 'reader' or 'commenter'
);
```

#### Make Public (Anyone with Link)

```typescript
import { makeGoogleDocumentPublic } from '@/lib/google-workspace-service';

await makeGoogleDocumentPublic(
  accessToken,
  refreshToken,
  fileId,
  'writer'
);
```

#### Export Back to Office Format

```typescript
import { exportToOfficeFormat } from '@/lib/google-workspace-service';

const buffer = await exportToOfficeFormat(
  accessToken,
  refreshToken,
  fileId,
  'document' // or 'spreadsheet' or 'presentation'
);

// Save buffer to file or send to user
```

## API Endpoints

### POST /api/documents/convert

Convert an Office document to Google Workspace format.

**Request:**
```json
{
  "fileId": "mongodb-file-id"
}
```

**Response:**
```json
{
  "success": true,
  "googleFileId": "google-drive-file-id",
  "googleFileType": "document",
  "editUrl": "https://docs.google.com/document/d/FILE_ID/edit",
  "viewUrl": "https://docs.google.com/document/d/FILE_ID/view"
}
```

## Component Usage

### DocumentViewer Component

Display documents with edit capability:

```tsx
import DocumentViewer from '@/components/DocumentViewer';

<DocumentViewer
  fileId="mongodb-file-id"
  filename="document.docx"
  mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
/>
```

Features:
- Shows appropriate icon based on file type
- Download button for original file
- "Edit Online" button for Office documents
- Automatic conversion on first edit
- Opens editor in new tab

## Database Schema

### File Model Updates

```typescript
{
  // Existing fields
  filename: String,
  originalName: String,
  mimeType: String,
  data: Buffer,
  
  // New Google Workspace fields
  googleFileId: String,           // Google Drive file ID
  googleFileType: String,          // 'document' | 'spreadsheet' | 'presentation'
  googleWebViewLink: String        // URL to view/edit in Google
}
```

## Supported File Types

### Word Documents → Google Docs
- `.doc` (application/msword)
- `.docx` (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

### Excel Spreadsheets → Google Sheets
- `.xls` (application/vnd.ms-excel)
- `.xlsx` (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

### PowerPoint Presentations → Google Slides
- `.ppt` (application/vnd.ms-powerpoint)
- `.pptx` (application/vnd.openxmlformats-officedocument.presentationml.presentation)

## Features

✅ **Automatic Conversion**: Office files automatically converted to Google format
✅ **Real-time Collaboration**: Multiple users can edit simultaneously
✅ **Version History**: Google Workspace tracks all changes
✅ **Comments & Suggestions**: Full collaboration features available
✅ **Auto-save**: Changes saved automatically
✅ **Access Control**: Share with specific users or make public
✅ **Export**: Convert back to Office format when needed
✅ **Embedded Editing**: Edit directly in the browser

## Troubleshooting

### "Google account not connected" Error

**Solution**: Connect your Google account first:
1. Visit `/api/gmail/auth`
2. Follow the OAuth flow
3. Grant permissions

### "Failed to convert document" Error

**Possible causes:**
- Google APIs not enabled in Cloud Console
- Invalid OAuth credentials
- Token expired (refresh token should handle this automatically)
- File type not supported

**Solution**: Check Google Cloud Console and verify all APIs are enabled

### Document Opens But Can't Edit

**Cause**: Insufficient permissions

**Solution**: Ensure document is shared with appropriate permissions (writer role)

## Security Considerations

1. **OAuth Tokens**: Stored securely in database, never exposed to client
2. **Access Control**: Documents can be restricted to specific users
3. **File Validation**: Only allowed file types can be uploaded
4. **Size Limits**: 10MB max file size enforced
5. **Audit Trail**: All conversions and edits logged

## Performance

- **First Conversion**: 2-5 seconds (upload + conversion)
- **Subsequent Opens**: Instant (uses cached Google file)
- **Concurrent Edits**: No limit (handled by Google)
- **Storage**: Original file in MongoDB, converted file in Google Drive

## Limitations

1. **Google Account Required**: At least one admin must connect Google account
2. **Internet Required**: Editing requires internet connection
3. **Google Drive Storage**: Converted files count toward Google Drive quota
4. **Format Fidelity**: Some complex formatting may not convert perfectly

## Future Enhancements

- [ ] Automatic sync back to MongoDB
- [ ] Offline editing support
- [ ] Direct embedding of Google editors in the app
- [ ] Batch conversion of multiple files
- [ ] Custom templates for new documents
- [ ] Integration with Google Drive folder structure
- [ ] Webhook notifications for document changes

## Support

For issues or questions:
1. Check Google Cloud Console for API status
2. Verify OAuth credentials are correct
3. Check browser console for errors
4. Review server logs for detailed error messages
