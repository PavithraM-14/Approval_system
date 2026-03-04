# External Sharing Feature Documentation

## Overview
The External Sharing feature allows users to generate secure, time-limited links to share documents with external parties. Shared documents are automatically watermarked for security.

## Features Implemented

### 1. ✅ Shareable Links
- Generate unique secure tokens for each share
- Format: `https://yourwebsite.com/share/{token}`
- Token: 64-character hexadecimal string (crypto-secure)

### 2. ✅ Link Expiry
Users can set expiry time when generating links:
- **1 Hour** - Quick temporary access
- **24 Hours** - Default, good for daily sharing
- **7 Days** - Week-long access
- **30 Days** - Extended access

**Expiry Behavior:**
- After expiry, link shows: "This link has expired."
- Displays expiry date and time
- No access to document after expiration

### 3. ✅ Automatic Watermarking
When accessed through share link, PDFs are watermarked with:
- **"CONFIDENTIAL"** - Large, centered text
- **Access Date/Time** - When the document was accessed
- **"Shared via S.E.A.D."** - Branding
- **Footer** - "CONFIDENTIAL - Shared Document"

**Watermark Features:**
- Applied dynamically (original file unchanged)
- Semi-transparent background
- Red text for visibility
- Multiple watermarks per page

### 4. ✅ Additional Security Features
- **Access Logging** - Tracks IP address, user agent, timestamp
- **Access Count** - Monitors how many times link was accessed
- **Max Access Limit** - Optional limit on number of accesses
- **Password Protection** - Optional password for extra security
- **Download Control** - Can disable downloads (view-only)
- **Active/Inactive Toggle** - Can deactivate links manually

## API Endpoints

### POST /api/share/create
Create a new share link

**Request Body:**
```json
{
  "documentId": "mongodb_id",  // For standalone documents
  "requestAttachment": {        // OR for request attachments
    "filePath": "/uploads/file.pdf",
    "fileName": "document.pdf",
    "requestId": "100000"
  },
  "expiryHours": 24,           // 1, 24, 168, 720
  "maxAccessCount": null,       // Optional
  "password": null,             // Optional
  "allowDownload": true,
  "watermarkEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "shareLink": {
    "id": "link_id",
    "url": "http://localhost:3000/share/abc123...",
    "token": "abc123...",
    "expiresAt": "2024-03-04T10:00:00Z",
    "allowDownload": true,
    "watermarkEnabled": true
  }
}
```

### GET /api/share/[token]
Access shared document

**Query Parameters:**
- `action`: "view" or "download"
- `password`: Optional password if required

**Response:**
- Success: Returns file with appropriate headers
- Expired: 410 Gone - "This link has expired."
- Invalid: 404 Not Found
- Wrong Password: 401 Unauthorized

### GET /api/share/[token]/info
Get share link information (without accessing document)

**Response:**
```json
{
  "token": "abc123...",
  "fileName": "document.pdf",
  "fileType": "PDF",
  "createdBy": "John Doe",
  "expiresAt": "2024-03-04T10:00:00Z",
  "isExpired": false,
  "isActive": true,
  "accessCount": 5,
  "maxAccessCount": null,
  "allowDownload": true,
  "watermarkEnabled": true,
  "requiresPassword": false
}
```

## User Interface

### Share Button
Located in Documents table Actions column:
- **Green "Share" button** with share icon
- Available for all documents
- Opens Share Modal

### Share Modal
**Before Generation:**
- Shows document name
- Expiry time selector (1h, 24h, 7d, 30d)
- Security notice about watermarking
- "Generate Share Link" button

**After Generation:**
- Displays generated URL
- Shows expiry time
- "Copy" button for easy sharing
- Success message

### Share Page (`/share/[token]`)
**Valid Link:**
- Document icon and name
- File type badge
- Shared by information
- Expiry date/time
- Access count (if limited)
- Watermark notice
- Password input (if required)
- "View Document" button (blue)
- "Download" button (gray, if allowed)

**Expired Link:**
- Clock icon
- "Link Expired" message
- Expiry date shown

**Inactive Link:**
- Lock icon
- "Link Inactive" message

## Database Schema

### ShareLink Model
```typescript
{
  token: String (unique, indexed),
  documentId: ObjectId (ref: Document),
  requestAttachment: {
    filePath: String,
    fileName: String,
    requestId: String
  },
  createdBy: ObjectId (ref: User),
  expiresAt: Date (indexed),
  accessCount: Number,
  maxAccessCount: Number,
  password: String,
  allowDownload: Boolean,
  watermarkEnabled: Boolean,
  accessLog: [{
    accessedAt: Date,
    ipAddress: String,
    userAgent: String
  }],
  isActive: Boolean,
  timestamps: true
}
```

## Security Features

### 1. Secure Token Generation
- Uses `crypto.randomBytes(32)` for cryptographically secure tokens
- 64-character hexadecimal string
- Virtually impossible to guess

### 2. Watermarking
- Applied dynamically on each access
- Original file never modified
- Contains access timestamp
- Visible but not intrusive

### 3. Access Control
- Time-based expiry
- Optional access count limit
- Optional password protection
- IP and user agent logging

### 4. Privacy
- No authentication required for access
- Links are self-contained
- Can be shared via any channel

## Usage Examples

### Example 1: Share for 24 Hours
```typescript
// User clicks Share button
// Selects "24 Hours"
// Clicks "Generate Share Link"
// Gets: https://mysite.com/share/abc123...
// Link expires in 24 hours
```

### Example 2: View Shared Document
```
1. Recipient opens link
2. Sees document info page
3. Clicks "View Document"
4. PDF opens in new tab with watermark:
   - "CONFIDENTIAL"
   - "Accessed: Mar 3, 2024, 10:30 AM"
   - "Shared via S.E.A.D."
```

### Example 3: Expired Link
```
1. Recipient opens link after 24 hours
2. Sees: "This link has expired."
3. Shows: "Expired on: Mar 4, 2024, 10:00 AM"
4. No access to document
```

## Testing

### Test Scenarios

1. **Generate Share Link**
   - Login as any user
   - Go to Documents
   - Click Share on any document
   - Select expiry time
   - Generate link
   - Verify link is created

2. **Access Valid Link**
   - Open generated link in incognito/private window
   - Verify document info displays
   - Click View
   - Verify PDF opens with watermark

3. **Test Expiry**
   - Generate link with 1 hour expiry
   - Wait 1 hour (or modify expiresAt in database)
   - Try to access link
   - Verify "Link Expired" message

4. **Test Download**
   - Access valid link
   - Click Download button
   - Verify file downloads

5. **Test Watermark**
   - Access PDF through share link
   - Verify watermark contains:
     - "CONFIDENTIAL"
     - Current date/time
     - "Shared via S.E.A.D."

## File Structure

```
approval_system/
├── models/
│   └── ShareLink.ts                    # Share link model
├── app/
│   ├── api/
│   │   └── share/
│   │       ├── create/
│   │       │   └── route.ts           # Create share link
│   │       └── [token]/
│   │           ├── route.ts           # Access shared document
│   │           └── info/
│   │               └── route.ts       # Get link info
│   ├── share/
│   │   └── [token]/
│   │       └── page.tsx               # Share page UI
│   └── dashboard/
│       └── documents/
│           └── page.tsx               # Updated with Share button
└── EXTERNAL_SHARING_FEATURE.md        # This file
```

## Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production:
```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Dependencies

- **pdf-lib**: For PDF watermarking
  ```bash
  npm install pdf-lib
  ```

## Future Enhancements (Optional)

1. **Email Notifications** - Send link via email
2. **QR Code** - Generate QR code for link
3. **Analytics** - Detailed access analytics
4. **Bulk Sharing** - Share multiple documents at once
5. **Custom Watermarks** - User-defined watermark text
6. **Image Watermarking** - Watermark images, not just PDFs
7. **Link Management** - View/manage all created links
8. **Revoke Links** - Manually revoke active links
9. **Access Restrictions** - IP whitelist/blacklist
10. **Two-Factor** - SMS/Email verification for access

## Troubleshooting

### Watermark Not Showing
- Check if file is PDF
- Verify pdf-lib is installed
- Check console for errors
- Ensure watermarkEnabled is true

### Link Not Working
- Verify token is correct
- Check if link expired
- Verify link is active
- Check database connection

### Cannot Generate Link
- Verify user is authenticated
- Check document exists
- Verify API endpoint is accessible
- Check browser console for errors

## Success Criteria

✅ Users can generate shareable links
✅ Links have configurable expiry times
✅ Expired links show appropriate message
✅ PDFs are automatically watermarked
✅ Watermark contains required information
✅ Original files remain unchanged
✅ Access is logged for security
✅ UI is intuitive and user-friendly

## Conclusion

The External Sharing feature provides a secure, user-friendly way to share documents with external parties while maintaining security through watermarking, expiry controls, and access logging.
