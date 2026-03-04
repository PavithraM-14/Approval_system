# Share Link Testing Guide

## What Was Fixed

1. ✅ Fixed syntax error in `documents/page.tsx` (removed duplicate code)
2. ✅ Added missing `path` import in `/api/share/[token]/info/route.ts`
3. ✅ Created sample PDF file at `/public/uploads/sample-document.pdf`
4. ✅ Fixed all request attachment paths in database (from `sample-document.pdf` to `/uploads/sample-document.pdf`)
5. ✅ Fixed existing share link path in database

## How to Test the Share Link Feature

### Step 1: Start the Development Server

```bash
cd approval_system
npm run dev
```

Wait for the server to start at `http://localhost:3000`

### Step 2: Login to the System

1. Open `http://localhost:3000/login`
2. Login with any test user:
   - Email: `john.doe@company.com`
   - Password: `password123`

### Step 3: Go to Documents Page

1. Click on "Documents" in the sidebar
2. You should see a list of documents including request attachments

### Step 4: Share a Document

1. Find any document in the list
2. Click the green "Share" button in the Actions column
3. In the Share Modal:
   - Select expiry time (1 Hour, 24 Hours, 7 Days, or 30 Days)
   - Click "Generate Share Link"
4. Copy the generated link

### Step 5: Test the Share Link

1. Open a new incognito/private browser window
2. Paste the share link (format: `http://localhost:3000/share/{token}`)
3. You should see:
   - Document name and type
   - Shared by information
   - Expiry date/time
   - Watermark notice
   - "View Document" and "Download" buttons

### Step 6: View the Watermarked Document

1. Click "View Document"
2. The PDF should open in a new tab with watermarks:
   - "CONFIDENTIAL" (large, centered)
   - Access date/time
   - "Shared via S.E.A.D."
   - Footer watermark

### Step 7: Test Download

1. Go back to the share page
2. Click "Download"
3. The file should download to your computer

## Testing the Existing Share Link

You already have a share link in the database. Try accessing it:

```
http://localhost:3000/share/9cc4f72323d72bd25355fb3da2d92f8cd14d55a47fe8a39540ca2e5d653a81a0
```

This link:
- Points to Request #100024 attachment
- Expires on: March 3, 2026, 7:53 PM
- Has watermarking enabled
- Allows downloads

## Features to Test

### 1. Link Expiry
- Generate a link with 1 hour expiry
- Wait 1 hour (or modify `expiresAt` in database)
- Try to access the link
- Should show "This link has expired"

### 2. Watermarking
- Access any PDF through share link
- Verify watermark contains:
  - "CONFIDENTIAL"
  - Current date/time
  - "Shared via S.E.A.D."

### 3. Access Logging
- Access a share link multiple times
- Check database: `sharelinks` collection
- Verify `accessCount` increases
- Verify `accessLog` array contains entries with IP, user agent, timestamp

### 4. Different Document Types
- Share different file types (PDF, DOC, XLS, etc.)
- Verify they all work
- Note: Only PDFs get watermarked

### 5. Password Protection (Future Enhancement)
Currently not implemented in UI, but backend supports it.

## Troubleshooting

### Issue: "Link Not Available" or "Failed to get share link info"

**Solution:**
- Make sure dev server is running
- Check browser console for errors
- Verify MongoDB connection
- Check that the token in URL matches database

### Issue: "File not found" when viewing document

**Solution:**
- Verify file exists at `/public/uploads/sample-document.pdf`
- Check that request attachment path starts with `/uploads/`
- Run: `npx tsx scripts/fix-request-attachments.ts`

### Issue: Watermark not showing

**Solution:**
- Verify file is PDF
- Check that `pdf-lib` is installed: `npm list pdf-lib`
- Check browser console for errors
- Verify `watermarkEnabled` is true in share link

### Issue: Cannot generate share link

**Solution:**
- Make sure you're logged in
- Check browser console for errors
- Verify document exists
- Check MongoDB connection

## Database Queries for Debugging

### View all share links:
```bash
npx tsx scripts/test-share-links.ts
```

### View request attachments:
```bash
npx tsx scripts/check-real-requests.ts
```

### Fix attachment paths:
```bash
npx tsx scripts/fix-request-attachments.ts
```

## Share Link URL Format

```
http://localhost:3000/share/{64-character-token}
```

Example:
```
http://localhost:3000/share/9cc4f72323d72bd25355fb3da2d92f8cd14d55a47fe8a39540ca2e5d653a81a0
```

## API Endpoints

### Create Share Link
```
POST /api/share/create
Body: {
  "requestAttachment": {
    "filePath": "/uploads/sample-document.pdf",
    "fileName": "sample-document.pdf",
    "requestId": "100024"
  },
  "expiryHours": 24,
  "watermarkEnabled": true,
  "allowDownload": true
}
```

### Get Share Link Info
```
GET /api/share/{token}/info
```

### Access Shared Document
```
GET /api/share/{token}?action=view
GET /api/share/{token}?action=download
```

## Success Criteria

✅ Share link page loads without errors
✅ Document information displays correctly
✅ View button opens PDF with watermark
✅ Download button downloads the file
✅ Expired links show appropriate message
✅ Access is logged in database
✅ Original file remains unchanged

## Next Steps

After testing, you can:
1. Share links with external users (no login required)
2. Monitor access logs for security
3. Deactivate links manually if needed
4. Set custom expiry times
5. Use for secure document distribution

## Notes

- Share links work without authentication
- Anyone with the link can access the document
- Watermarks are applied dynamically (original file unchanged)
- Links can be revoked by setting `isActive: false` in database
- Access logs include IP address and user agent for security

