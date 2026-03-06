# ConvertAPI Setup Guide

## What is ConvertAPI?

ConvertAPI is a cloud-based document conversion service that provides reliable Office document to PDF conversion. It's used in this project to convert Word, Excel, and PowerPoint files to PDF format for viewing and watermarking.

## Why ConvertAPI?

- **Reliable**: Professional-grade conversion that preserves formatting
- **Fast**: Cloud-based processing (1-3 seconds per document)
- **Easy**: Simple API integration
- **Free Tier**: 250 conversions/month at no cost
- **No Server Dependencies**: No need to install LibreOffice or other tools

## Setup Instructions

### Step 1: Create Free Account

1. Go to [https://www.convertapi.com/](https://www.convertapi.com/)
2. Click "Sign Up" or "Get Started Free"
3. Register with your email
4. Verify your email address

### Step 2: Get API Secret

1. Log in to your ConvertAPI dashboard
2. Navigate to "API Secret" section
3. Copy your secret key (looks like: `secret_xxxxxxxxxxxxx`)

### Step 3: Add to Environment Variables

1. Open your `.env.local` file (or create it if it doesn't exist)
2. Add the following line:
   ```
   CONVERTAPI_SECRET=secret_xxxxxxxxxxxxx
   ```
3. Replace `secret_xxxxxxxxxxxxx` with your actual secret key
4. Save the file

### Step 4: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Testing

### Test 1: Upload Office Document
1. Go to http://localhost:3000/dashboard/documents
2. Upload a Word, Excel, or PowerPoint file
3. Click "View" button
4. ✅ Document should convert to PDF and open in browser

### Test 2: Check Logs
Look for these log messages in your terminal:
```
🔄 Converting Office document to PDF: document.docx
✅ Document converted successfully using ConvertAPI
```

### Test 3: Share Link
1. Create a share link for an Office document
2. Open the share link
3. Click "View Document"
4. ✅ Should convert to PDF with watermark

## Free Tier Limits

- **250 conversions/month** (free)
- Resets monthly
- No credit card required for free tier

### Monitoring Usage

1. Log in to ConvertAPI dashboard
2. Check "Usage" section
3. See conversion count and remaining quota

## Fallback Behavior

If ConvertAPI is not configured or fails:
- System falls back to basic HTML preview
- Shows document metadata and info
- Watermark still applied
- Not ideal but prevents errors

## Paid Plans (Optional)

If you need more conversions:
- **Starter**: $9/month - 1,500 conversions
- **Professional**: $29/month - 6,000 conversions
- **Business**: Custom pricing

Visit [https://www.convertapi.com/pricing](https://www.convertapi.com/pricing)

## Troubleshooting

### Error: "CONVERTAPI_SECRET not set"
**Solution**: Add the secret to `.env.local` file and restart server

### Error: "ConvertAPI conversion failed"
**Possible causes:**
1. Invalid API secret
2. Monthly quota exceeded
3. Network connectivity issues
4. Unsupported file format

**Solution**: Check logs for specific error message

### Conversion is slow
**Normal behavior**: First conversion may take 2-5 seconds
**If consistently slow**: Check your internet connection

### Quota exceeded
**Solution**: 
1. Wait for monthly reset, or
2. Upgrade to paid plan, or
3. Use fallback mode (basic preview)

## Security Notes

- Keep your API secret private
- Don't commit `.env.local` to git
- API secret is only used server-side
- Documents are processed securely by ConvertAPI
- Temporary files are deleted after conversion

## Alternative Solutions

If you prefer not to use ConvertAPI:

### Option 1: LibreOffice (Self-hosted)
- Install LibreOffice on server
- Use command-line conversion
- Free but requires server setup
- More complex deployment

### Option 2: Microsoft Graph API
- Use Microsoft's official API
- Requires Azure account
- More complex authentication
- Good for enterprise

### Option 3: Google Docs API
- Use Google's conversion service
- Requires Google Cloud account
- OAuth setup required
- Good for Google Workspace users

## Support

- ConvertAPI Documentation: [https://www.convertapi.com/doc](https://www.convertapi.com/doc)
- ConvertAPI Support: support@convertapi.com
- Project Issues: Create an issue in the repository

## Summary

1. ✅ Sign up at convertapi.com
2. ✅ Get your API secret
3. ✅ Add to `.env.local`
4. ✅ Restart server
5. ✅ Test with Office documents

That's it! Your Office documents will now convert properly to PDF.
