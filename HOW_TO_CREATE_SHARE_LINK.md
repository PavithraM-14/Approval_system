# How to Create a Working Share Link

## Current Status

✅ Database seeded with 25 approval requests
✅ All requests have correct attachment paths (`/uploads/sample-document.pdf`)
✅ Sample PDF file exists at `/public/uploads/sample-document.pdf`
✅ Old broken share links deleted

## Steps to Create a New Share Link

### 1. Start the Development Server

```bash
cd approval_system
npm run dev
```

Wait for the server to start at `http://localhost:3000`

### 2. Login to the System

1. Open `http://localhost:3000/login`
2. Login with test credentials:
   - **Email:** `john.doe@company.com`
   - **Password:** `password123`

### 3. Navigate to Documents Page

1. Click on **"Documents"** in the left sidebar
2. You should see a list of documents including request attachments

### 4. Create a Share Link

1. Find any document in the list (e.g., "New Laboratory Equipment Purchase")
2. Click the green **"Share"** button in the Actions column
3. In the Share Modal:
   - Select expiry time:
     - 1 Hour
     - 24 Hours (recommended)
     - 7 Days
     - 30 Days
   - Click **"Generate Share Link"**
4. Copy the generated link

### 5. Test the Share Link

1. Open a new **incognito/private browser window**
2. Paste the share link
3. You should see:
   - Document name (e.g., "New Laboratory Equipment Purchase")
   - File type: PDF Document
   - Shared by: Your name
   - Expiry date
   - Watermark notice
   - **View Document** button (blue)
   - **Download** button (gray)

### 6. Test View and Download

1. Click **"View Document"**
   - PDF should open in new tab
   - Should have watermarks:
     - "CONFIDENTIAL" (large, centered)
     - Access date/time
     - "Shared via S.E.A.D."

2. Click **"Download"**
   - File should download to your computer
   - Downloaded file should also have watermarks

## Available Test Requests

After seeding, you have 25 requests with attachments:

1. **Request 100000** - New Laboratory Equipment Purchase (Computer Science)
2. **Request 100001** - Software License Renewal (Computer Science)
3. **Request 100002** - Conference Travel Request (Computer Science)
4. **Request 100003** - Infrastructure Upgrade Project (Mechanical)
5. **Request 100004** - Training Program for Faculty (Electrical)
... and 20 more

All of these have the same sample PDF attached and can be shared.

## Troubleshooting

### Issue: "Failed to get share link info"
**Solution:** The share link might be for a deleted request. Create a new share link from the Documents page.

### Issue: "File not found" when viewing
**Solution:** 
1. Make sure the sample PDF exists: `public/uploads/sample-document.pdf`
2. Run: `npx tsx scripts/create-sample-pdf.ts`

### Issue: Document name shows MongoDB ID
**Solution:** This is fixed in the latest code. The API now fetches the request title.

### Issue: View/Download buttons don't work
**Solution:**
1. Make sure request attachments have correct paths
2. Run: `npx tsx scripts/fix-request-attachments.ts`

## Verification Commands

### Check if sample PDF exists:
```bash
dir public\uploads\sample-document.pdf
```

### Check requests in database:
```bash
npx tsx scripts/check-real-requests.ts
```

### Check share links:
```bash
npx tsx scripts/test-share-links.ts
```

### Verify complete setup:
```bash
npx tsx scripts/verify-share-setup.ts
```

## Important Notes

1. **Always create share links from the UI** - Don't manually create them in the database
2. **The share link stores a snapshot** - If you delete the request, the share link becomes orphaned
3. **File paths must start with `/uploads/`** - This is handled automatically when uploading files
4. **Sample PDF is shared by all seeded requests** - In production, each request would have its own unique file

## What's Fixed

✅ Document name displays request title (not filename or MongoDB ID)
✅ View button opens PDF with watermark
✅ Download button downloads watermarked PDF
✅ File paths are constructed correctly on Windows
✅ Request attachments have correct paths with `/uploads/` prefix
✅ Orphaned share links are cleaned up

## Next Steps

1. Start the dev server
2. Login to the system
3. Go to Documents page
4. Create a new share link
5. Test it in incognito mode

The share link feature is now fully functional!

