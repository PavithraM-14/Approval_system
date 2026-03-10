# Current Behavior - Office Document Handling

## ✅ Correct Behavior (As Implemented)

### 1. Upload/Storage
**What happens:** Files are stored in their ORIGINAL format
- Word files stored as `.docx`
- Excel files stored as `.xlsx`
- PowerPoint files stored as `.pptx`
- PDF files stored as `.pdf`

**No conversion happens during:**
- File upload
- Document creation
- File storage
- Listing documents

### 2. View Button (Internal Users)
**What happens:** Conversion to PDF on-demand
- User clicks "View" button
- System detects file type
- If Office document → Converts to PDF using ConvertAPI
- Opens PDF in browser
- Original file remains unchanged

**Code location:** `app/api/view/route.ts`

### 3. Share Link (External Users)
**What happens:** Conversion to PDF with watermark on-demand
- External user clicks "View Document"
- System detects file type
- If Office document → Converts to PDF using ConvertAPI
- Applies watermark to PDF
- Opens watermarked PDF in browser
- Original file remains unchanged
- No download option available

**Code location:** `app/api/share/[token]/route.ts`

## File Storage Locations

### MongoDB (Request Attachments)
- Stored as binary data
- Original format preserved
- File ID used as reference

### Filesystem (Standalone Documents)
- Stored in `/public/documents/{department}/`
- Original format preserved
- File path used as reference

## Conversion Flow

```
Upload → Store Original → No Conversion
                ↓
        User clicks "View"
                ↓
        Detect file type
                ↓
        Office doc? → Convert to PDF → Display
        PDF? → Display directly
                ↓
        Original file unchanged
```

```
Share Link → Store Original → No Conversion
                ↓
        External user clicks "View Document"
                ↓
        Detect file type
                ↓
        Office doc? → Convert to PDF → Add Watermark → Display
        PDF? → Add Watermark → Display
                ↓
        Original file unchanged
```

## What Gets Converted

### ✅ Converted to PDF (on-demand):
- When viewing via "View" button
- When accessing via share link
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)
- PowerPoint presentations (.ppt, .pptx)

### ❌ NOT Converted:
- During upload
- During storage
- When listing documents
- When downloading (if download enabled)
- PDF files (already PDF)
- Image files
- Other file types

## Watermark Application

### ✅ Watermark Applied:
- Share links only
- External user access
- Both PDF and Office documents
- On-demand during viewing

### ❌ Watermark NOT Applied:
- Internal viewing (View button)
- During upload
- During storage
- Original files

## Performance

### Upload: Fast
- No conversion
- Direct storage
- Original format

### View (Internal): 1-3 seconds
- Conversion happens on-demand
- ConvertAPI processes
- PDF displayed

### Share Link (External): 1-3 seconds
- Conversion happens on-demand
- Watermark applied
- PDF displayed

## Verification

To verify correct behavior:

1. **Upload a Word document**
   - Check storage: Should be `.docx`
   - Check database: Should show `.docx`

2. **Click "View" button**
   - Should convert to PDF
   - Should open in browser
   - Check storage: Original still `.docx`

3. **Create share link**
   - Check storage: Original still `.docx`
   - Open share link
   - Should convert to PDF with watermark
   - Check storage: Original still `.docx`

## Summary

✅ Files stored in original format
✅ Conversion only on viewing
✅ Watermark only on share links
✅ Original files never modified
✅ On-demand processing
✅ No unnecessary conversions

This is the correct behavior as requested!
