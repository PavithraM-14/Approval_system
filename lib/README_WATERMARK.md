# Watermark Utility

This utility provides watermarking functionality for documents shared through the S.E.A.D. system.

## Features

- **PDF Watermarking**: Direct watermark application to PDF files
- **Office Document Watermarking**: Converts Word, Excel, and PowerPoint documents to PDF with watermark
- **Consistent Branding**: All watermarked documents show "S.E.A.D." and access timestamp
- **Security**: Original files remain unchanged; watermarks are applied dynamically

## Supported File Types

- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Microsoft PowerPoint (.ppt, .pptx)

## Usage

```typescript
import { 
  applyPdfWatermark, 
  convertOfficeToPdfWithWatermark, 
  supportsWatermark, 
  isOfficeDocument 
} from './lib/watermark';

// Check if file supports watermarking
const fileExt = '.docx';
if (supportsWatermark(fileExt)) {
  // File can be watermarked
}

// For PDF files
const pdfBuffer = await readFile('document.pdf');
const watermarkedPdf = await applyPdfWatermark(pdfBuffer);

// For Office documents
const docxBuffer = await readFile('document.docx');
const watermarkedPdf = await convertOfficeToPdfWithWatermark(
  docxBuffer, 
  'document.docx', 
  '.docx'
);
```

## Functions

### `applyPdfWatermark(pdfBuffer: Buffer): Promise<Buffer>`
Applies watermark directly to a PDF file.

**Parameters:**
- `pdfBuffer`: Buffer containing the PDF file data

**Returns:** Promise resolving to watermarked PDF buffer

### `convertOfficeToPdfWithWatermark(fileBuffer: Buffer, fileName: string, fileExt: string): Promise<Buffer>`
Converts Office documents to PDF and applies watermark.

**Parameters:**
- `fileBuffer`: Buffer containing the Office document data
- `fileName`: Original filename (for display purposes)
- `fileExt`: File extension (e.g., '.docx', '.xlsx', '.pptx')

**Returns:** Promise resolving to watermarked PDF buffer

### `supportsWatermark(fileExt: string): boolean`
Checks if a file type supports watermarking.

**Parameters:**
- `fileExt`: File extension to check

**Returns:** `true` if watermarking is supported

### `isOfficeDocument(fileExt: string): boolean`
Checks if a file is an Office document.

**Parameters:**
- `fileExt`: File extension to check

**Returns:** `true` if file is Word, Excel, or PowerPoint

## Watermark Details

The watermark includes:
- **Main Text**: "S.E.A.D." in large, semi-transparent gray text
- **Timestamp**: Access date and time in format "Accessed: MMM DD, YYYY, HH:MM AM/PM"
- **Rotation**: 45-degree angle for visibility
- **Opacity**: 50% to maintain document readability

## Technical Details

### PDF Watermarking
Uses `pdf-lib` library to:
1. Load the PDF document
2. Iterate through all pages
3. Add rotated text watermarks to each page
4. Save the modified PDF

### Office Document Conversion
Uses `puppeteer` to:
1. Create a temporary file from the buffer
2. Generate HTML preview with watermark overlay
3. Convert HTML to PDF using headless Chrome
4. Apply additional PDF watermark
5. Clean up temporary files

## Dependencies

- `pdf-lib`: ^1.17.1 - PDF manipulation
- `puppeteer`: ^24.33.0 - Headless browser for Office conversion

## Error Handling

All functions include error handling:
- Failed watermarking falls back to original file
- Temporary files are cleaned up even on error
- Browser instances are properly closed
- Detailed error logging for debugging

## Performance Considerations

- PDF watermarking is fast (< 1 second for most documents)
- Office document conversion takes longer (2-5 seconds) due to:
  - Temporary file creation
  - Browser launch
  - HTML rendering
  - PDF generation
- Consider implementing caching for frequently accessed documents

## Security Notes

- Original files are never modified
- Watermarks are applied on-the-fly during access
- Temporary files are immediately deleted after processing
- Browser runs in sandboxed mode with security flags

## Future Enhancements

- Custom watermark text per share link
- Configurable watermark position and style
- Image watermarking support
- Caching of converted Office documents
- Batch watermarking for multiple files
