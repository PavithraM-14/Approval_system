# ConvertAPI Test Guide

## ✅ Setup Complete!

Your ConvertAPI secret has been added to `.env.local`:
```
CONVERTAPI_SECRET=XSTZV7Xax84mdGH3xwjd7u4EQTMw52Up
```

## Testing Steps

### Step 1: Restart Server
```bash
# Stop the server (Ctrl+C if running)
npm run dev
```

### Step 2: Test with Word Document
1. Go to http://localhost:3000/dashboard/documents
2. Upload a `.docx` file (Word document)
3. Click the "View" button
4. ✅ Expected: Document converts to PDF and opens in browser

### Step 3: Test with Excel
1. Upload a `.xlsx` file (Excel spreadsheet)
2. Click "View"
3. ✅ Expected: Spreadsheet converts to PDF and opens

### Step 4: Test with PowerPoint
1. Upload a `.pptx` file (PowerPoint presentation)
2. Click "View"
3. ✅ Expected: Presentation converts to PDF and opens

### Step 5: Test Share Link
1. Create a share link for any Office document
2. Open the share link in new tab/incognito
3. Click "View Document"
4. ✅ Expected: Converts to PDF with watermark and opens

### Step 6: Check Console Logs
Look for these messages in your terminal:
```
🔄 Converting Office document to PDF: document.docx
✅ Document converted successfully using ConvertAPI
```

## What to Expect

### Success Indicators:
- ✅ Office documents open as PDF in browser
- ✅ All content visible (text, images, formatting)
- ✅ Watermark appears on shared documents
- ✅ Console shows "converted successfully using ConvertAPI"

### If Something Goes Wrong:

**Error: "CONVERTAPI_SECRET not set"**
- Check `.env.local` file has the secret
- Restart the server

**Error: "ConvertAPI conversion failed"**
- Check internet connection
- Verify API secret is correct
- Check ConvertAPI dashboard for quota

**Fallback Mode Activates**
- Shows basic preview instead of full content
- Means ConvertAPI didn't work
- Check logs for specific error

## Your API Key Info

- **Secret**: XSTZV7Xax84mdGH3xwjd7u4EQTMw52Up
- **Free Tier**: 250 conversions/month
- **Dashboard**: https://www.convertapi.com/a

## Sample Test Files

If you need test files:
- Create a simple Word document with text and images
- Create an Excel spreadsheet with data
- Create a PowerPoint with a few slides

## Monitoring Usage

1. Log in to https://www.convertapi.com/
2. Go to Dashboard
3. Check "Conversions" count
4. Monitor remaining quota

## Next Steps

Once testing is successful:
1. ✅ Office documents will convert properly
2. ✅ Share links will work with full content
3. ✅ Watermarks will be applied
4. ✅ No download options on share links

## Support

If you encounter issues:
1. Check server console for error messages
2. Verify `.env.local` has the correct secret
3. Test with different file types
4. Check ConvertAPI dashboard for errors

## Success!

Once you see Office documents converting to PDF with full content, the implementation is working perfectly! 🎉
