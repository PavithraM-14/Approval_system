# Watermark Testing Guide

## Quick Test Checklist

### Prerequisites
- S.E.A.D. system running
- Test documents ready (PDF, DOCX, XLSX, PPTX)
- User account with document upload permissions

## Test Cases

### Test 1: PDF Watermarking (Existing Functionality)
**Objective**: Verify PDF watermarking still works correctly

**Steps:**
1. Upload a PDF document to the system
2. Navigate to Documents page
3. Click "Share" button on the PDF
4. Select expiry time (e.g., 24 hours)
5. Click "Generate Share Link"
6. Copy the generated link
7. Open link in new browser/incognito window
8. Click "View Document"

**Expected Results:**
- PDF opens with watermark visible
- Watermark shows "S.E.A.D." in center at 45° angle
- Timestamp shows "Accessed: [current date/time]"
- Watermark appears on all pages
- Document is readable despite watermark

### Test 2: Word Document Watermarking (NEW)
**Objective**: Verify Word documents are converted to PDF with watermark

**Steps:**
1. Upload a .docx file (multi-page recommended)
2. Share the document (same process as Test 1)
3. Access the share link
4. Click "View Document"

**Expected Results:**
- Document is converted to PDF format
- Watermark appears on all pages
- Original content is preserved and readable
- Filename changes from .docx to .pdf
- Header shows "X-Original-Type: .docx"

**Test with:**
- Simple text document
- Document with images
- Document with tables
- Multi-page document (5+ pages)

### Test 3: Excel Spreadsheet Watermarking (NEW)
**Objective**: Verify Excel files are converted to PDF with watermark

**Steps:**
1. Upload a .xlsx file
2. Share the document
3. Access the share link
4. Click "View Document"

**Expected Results:**
- Spreadsheet is converted to PDF
- Watermark appears on all pages
- Data is visible and readable
- Formatting is preserved as much as possible
- Multiple sheets are included in PDF

**Test with:**
- Single sheet workbook
- Multi-sheet workbook
- Spreadsheet with charts
- Spreadsheet with formulas

### Test 4: PowerPoint Presentation Watermarking (NEW)
**Objective**: Verify PowerPoint files are converted to PDF with watermark

**Steps:**
1. Upload a .pptx file
2. Share the document
3. Access the share link
4. Click "View Document"

**Expected Results:**
- Presentation is converted to PDF
- Each slide becomes a PDF page
- Watermark appears on all slides
- Slide content is preserved
- Images and text are visible

**Test with:**
- Simple text slides
- Slides with images
- Slides with animations (will be static)
- Multi-slide presentation (10+ slides)

### Test 5: Download Functionality
**Objective**: Verify watermarked documents can be downloaded

**Steps:**
1. Access any shared document link
2. Click "Download Document" button
3. Save the file
4. Open downloaded file

**Expected Results:**
- File downloads successfully
- Downloaded file is PDF format (even for Office docs)
- Watermark is present in downloaded file
- Filename reflects conversion (e.g., document.docx → document.pdf)

### Test 6: Watermark Disabled
**Objective**: Verify documents can be shared without watermark

**Steps:**
1. Upload any document
2. Share the document
3. Uncheck "Enable Watermark" (if option exists)
4. Access the share link

**Expected Results:**
- Document opens without watermark
- Original file format is preserved
- No conversion occurs

### Test 7: Error Handling
**Objective**: Verify system handles errors gracefully

**Test Cases:**
a) **Corrupted Office Document**
   - Upload a corrupted .docx file
   - Share and access
   - Expected: Error message or fallback to original file

b) **Very Large File**
   - Upload a large Office document (50+ MB)
   - Share and access
   - Expected: Conversion completes or timeout with error

c) **Unsupported File Type**
   - Upload a .txt or .zip file
   - Share and access
   - Expected: File served without watermark

### Test 8: Performance Testing
**Objective**: Measure conversion times

**Steps:**
1. Share documents of various sizes
2. Time the conversion process
3. Record results

**Expected Performance:**
- PDF watermarking: < 1 second
- Word conversion: 2-5 seconds
- Excel conversion: 2-5 seconds
- PowerPoint conversion: 3-7 seconds (depends on slide count)

### Test 9: Multi-Page Documents
**Objective**: Verify watermark appears on all pages

**Steps:**
1. Upload a 20+ page Word document
2. Share and access
3. Scroll through all pages

**Expected Results:**
- Watermark on every page
- Consistent positioning
- Same opacity throughout

### Test 10: Security Verification
**Objective**: Ensure original files are not modified

**Steps:**
1. Upload a document
2. Note the file hash/checksum
3. Share the document multiple times
4. Access the share links
5. Check original file hash

**Expected Results:**
- Original file hash unchanged
- Watermark applied dynamically
- No permanent modifications

## Browser Compatibility Testing

Test on multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Regression Testing

After implementation, verify:
- Existing PDF sharing still works
- Non-watermarked shares work
- Password-protected shares work
- Expired link handling works
- Access logging still functions

## Performance Benchmarks

Document typical conversion times:

| Document Type | Size | Pages/Slides | Conversion Time |
|--------------|------|--------------|-----------------|
| PDF | 1 MB | 10 | < 1s |
| DOCX | 500 KB | 5 | 2-3s |
| XLSX | 200 KB | 3 sheets | 2-4s |
| PPTX | 2 MB | 15 | 4-6s |

## Known Limitations

Document any limitations found:
- Complex Excel formulas may not render perfectly
- PowerPoint animations become static
- Very large files may timeout
- Some fonts may be substituted

## Troubleshooting

### Watermark Not Appearing
1. Check browser console for errors
2. Verify puppeteer is installed
3. Check server logs
4. Ensure sufficient memory available

### Conversion Fails
1. Check file is not corrupted
2. Verify file size is reasonable
3. Check server has required dependencies
4. Review error logs

### Slow Performance
1. Check server resources (CPU, memory)
2. Verify no other heavy processes running
3. Consider implementing caching
4. Check network speed for large files

## Success Criteria

All tests pass if:
- ✅ PDF watermarking works as before
- ✅ Word documents convert and watermark correctly
- ✅ Excel files convert and watermark correctly
- ✅ PowerPoint files convert and watermark correctly
- ✅ Downloads include watermarks
- ✅ Original files remain unchanged
- ✅ Error handling is graceful
- ✅ Performance is acceptable
- ✅ All browsers supported
- ✅ No regressions in existing features

## Reporting Issues

When reporting issues, include:
- Document type and size
- Browser and version
- Error messages (console and server logs)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
