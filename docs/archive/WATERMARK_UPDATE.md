# Watermark Update - Diagonal S.E.A.D. in Center

## Changes Made

### Watermark Style
**Before:**
- Small text at bottom
- Horizontal orientation
- "Shared via S.E.A.D." text

**After:**
- Large "S.E.A.D." text in center
- 45-degree diagonal slant
- Access date below (also slanted)
- Applied to BOTH view and download

### Visual Details

**Main Text (S.E.A.D.):**
- Font: Helvetica Bold
- Size: 60pt
- Color: Light gray (85% gray)
- Opacity: 30%
- Position: Center of page
- Rotation: 45 degrees (diagonal)

**Date Text:**
- Font: Helvetica Bold
- Size: 12pt
- Color: Gray (75% gray)
- Opacity: 30%
- Position: Below main text
- Rotation: 45 degrees (same angle)
- Format: "Accessed: Mar 4, 2026, 08:51 AM"

### Applied To

✅ **View** - When clicking "View Document"
✅ **Download** - When clicking "Download" (watermark is in the downloaded file)

### Code Changes

**File: `app/api/share/[token]/route.ts`**

1. **Watermark Function:**
   - Changed to center positioning
   - Added 45-degree rotation
   - Increased font size for visibility
   - Made text bold for better appearance

2. **Application Logic:**
   - Removed `action === 'view'` condition
   - Now applies to both view AND download
   - Watermark is permanent in downloaded files

**File: `app/share/[token]/page.tsx`**
- Updated notice text to reflect diagonal watermark

## How It Looks

```
                    S.E.A.D.
              Accessed: Mar 4, 2026, 08:51 AM
```
(Both lines rotated 45 degrees diagonally across the center of each page)

## Testing

1. **View Document:**
   - Click "View Document" button
   - PDF opens in browser
   - See diagonal "S.E.A.D." watermark in center

2. **Download Document:**
   - Click "Download" button
   - File downloads to computer
   - Open downloaded PDF
   - Watermark is present in the file

## Benefits

✅ **Visible** - Large, centered text is easy to see
✅ **Professional** - Diagonal orientation looks modern
✅ **Permanent** - Watermark stays in downloaded files
✅ **Non-intrusive** - Light gray with transparency doesn't block content
✅ **Secure** - Shows document was shared via S.E.A.D. with timestamp

## Technical Details

### Rotation Implementation
```typescript
page.drawText(mainText, {
  x: centerX - mainTextWidth / 2,
  y: centerY,
  size: mainFontSize,
  font: font,
  color: rgb(0.85, 0.85, 0.85),
  opacity: 0.3,
  rotate: {
    angle: 45,
    type: 'degrees'
  }
});
```

### Download with Watermark
```typescript
// Apply watermark if enabled and file is PDF (for both view and download)
if (shareLink.watermarkEnabled && fileExt === '.pdf') {
  const watermarkedPdf = await applyWatermark(fileBuffer);
  const disposition = action === 'download' ? 'attachment' : 'inline';
  
  return new NextResponse(watermarkedPdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'X-Watermarked': 'true'
    }
  });
}
```

## Summary

✅ Watermark shows "S.E.A.D." diagonally in center
✅ Access date shown below main text
✅ Applied to both view and download
✅ Watermark is permanent in downloaded files
✅ Professional appearance with 45-degree slant

**The watermark now appears exactly as requested!**

