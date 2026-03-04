# View and Download API Fix

## Problem

When trying to view or download documents from the Documents page or share links, you were getting an error:
```
ENOENT: no such file or directory, open 'C:\Users\HP\Desktop\approval_tn_impact\approval_system\public\\69a0b47a787abe4e7c5e31d9'
```

## Root Cause

The system stores files in two different ways:

1. **MongoDB GridFS** - Files stored in database (used by some features)
2. **Filesystem** - Files stored in `/public/uploads/` (used by request attachments)

The `/api/view` and `/api/download` routes were only designed to handle MongoDB file IDs, but the Documents page and share links were passing filesystem paths.

## Solution

Updated both `/api/view/route.ts` and `/api/download/route.ts` to handle BOTH:
- MongoDB file IDs (24-character ObjectIds)
- Filesystem file paths (e.g., `/uploads/sample-document.pdf`)

### How It Works

The routes now check the `file` parameter:

1. **If it's a valid MongoDB ObjectId (24 characters):**
   - Fetch file from MongoDB GridFS
   - Return file data from database

2. **If it's a file path:**
   - Clean the path (remove leading slash)
   - Construct full filesystem path
   - Read file from disk
   - Return file data

### Code Changes

#### Before (MongoDB only):
```typescript
const fileId = searchParams.get('file');
if (!mongoose.Types.ObjectId.isValid(fileId)) {
  return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
}
const fileDoc = await File.findById(fileId);
```

#### After (Both MongoDB and Filesystem):
```typescript
const fileParam = searchParams.get('file');

if (mongoose.Types.ObjectId.isValid(fileParam) && fileParam.length === 24) {
  // Handle MongoDB file
  const fileDoc = await File.findById(fileParam);
  // ... return from database
} else {
  // Handle filesystem file
  const cleanPath = fileParam.startsWith('/') ? fileParam.substring(1) : fileParam;
  const filePath = path.join(process.cwd(), 'public', cleanPath);
  const fileBuffer = await readFile(filePath);
  // ... return from filesystem
}
```

## Files Modified

1. `app/api/view/route.ts` - Now handles both MongoDB and filesystem files
2. `app/api/download/route.ts` - Now handles both MongoDB and filesystem files

## What Works Now

✅ View documents from Documents page (request attachments)
✅ Download documents from Documents page (request attachments)
✅ View documents from share links
✅ Download documents from share links
✅ View documents stored in MongoDB
✅ Download documents stored in MongoDB
✅ Proper error messages when file not found

## Testing

### Test Filesystem Files (Request Attachments)

1. Go to Documents page
2. Find a document with "Request #" badge
3. Click "View" - should open PDF in new tab
4. Click "Download" - should download the file

### Test Share Links

1. Open share link in browser
2. Click "View Document" - should open PDF with watermark
3. Click "Download" - should download watermarked PDF

### Test MongoDB Files

1. Upload a new document (if you have upload feature)
2. Try to view/download using MongoDB file ID
3. Should work as before

## Supported File Types

The routes now support these content types:
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Excel (`.xls`, `.xlsx`)
- Images (`.jpg`, `.jpeg`, `.png`)
- Text (`.txt`)
- Others (generic `application/octet-stream`)

## Error Handling

The routes now provide better error messages:

- **File not found in database:** "File not found in database"
- **File not found on filesystem:** "File not found on filesystem" (includes path for debugging)
- **Missing parameter:** "File parameter is required"
- **General errors:** Includes error details in response

## Path Handling

The routes properly handle paths with or without leading slashes:

- Input: `/uploads/sample-document.pdf` → Works ✅
- Input: `uploads/sample-document.pdf` → Works ✅
- Input: `69a0b47a787abe4e7c5e31d9` (MongoDB ID) → Works ✅

## Logging

Both routes now log file access for debugging:

**MongoDB files:**
```
👁️ File view (MongoDB): { fileId, filename, size, mimeType }
📥 File download (MongoDB): { fileId, filename, size, mimeType }
```

**Filesystem files:**
```
👁️ File view (filesystem): { path, filename, size, contentType }
📥 File download (filesystem): { path, filename, size, contentType }
```

## Summary

The view and download APIs are now unified and can handle files from both storage systems. This fixes the error you were seeing and makes the system more robust for future use.

