# Test Script - Office Document Viewing

## Prerequisites
- Server running on http://localhost:3000
- Test files: sample.pdf, sample.docx, sample.xlsx, sample.pptx

## Test 1: Documents Page - PDF
1. Upload a PDF file
2. Click "View" button
3. ✅ PDF opens in new tab in browser

## Test 2: Documents Page - Word
1. Upload a .docx file
2. Click "View" button
3. ✅ Document converts to PDF
4. ✅ Opens in browser (not download)

## Test 3: Documents Page - Excel
1. Upload a .xlsx file
2. Click "View" button
3. ✅ Spreadsheet converts to PDF
4. ✅ Opens in browser

## Test 4: Documents Page - PowerPoint
1. Upload a .pptx file
2. Click "View" button
3. ✅ Presentation converts to PDF
4. ✅ Opens in browser

## Test 5: Share Link - PDF
1. Share a PDF document
2. Open share link
3. Click "View Document"
4. ✅ PDF opens with watermark
5. ✅ No download button visible

## Test 6: Share Link - Office Documents
1. Share a Word/Excel/PowerPoint file
2. Open share link
3. ✅ Info shows conversion notice
4. Click "View Document"
5. ✅ Converts to PDF with watermark
6. ✅ Opens in browser
7. ✅ No download button

## Test 7: Security - No Downloads
1. Get a share link URL
2. Try adding `?action=download`
3. ✅ Still opens inline (not download)

## Expected Results
✅ All Office documents convert to PDF
✅ Everything opens in browser
✅ No download options on share links
✅ Watermarks visible on shared documents
