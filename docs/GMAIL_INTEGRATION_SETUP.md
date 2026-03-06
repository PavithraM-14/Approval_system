# Gmail API Integration Setup Guide

Complete guide to set up Gmail integration for S.E.A.D. system.

## Overview

Gmail integration provides:
- ✅ Auto-save email attachments to document library
- ✅ Send documents via email
- ✅ Parse email metadata
- ✅ Monitor inbox for new emails
- ✅ 100% FREE (no cost)

---

## Step 1: Create Google Cloud Project

### 1.1 Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 1.2 Create New Project
1. Click "Select a project" dropdown (top left)
2. Click "NEW PROJECT"
3. Enter project name: "SEAD Approval System"
4. Click "CREATE"
5. Wait for project creation (takes ~30 seconds)

### 1.3 Select Your Project
1. Click "Select a project" dropdown
2. Select "SEAD Approval System"

---

## Step 2: Enable Gmail API

### 2.1 Navigate to APIs & Services
1. Click hamburger menu (☰) top left
2. Click "APIs & Services" → "Library"

### 2.2 Enable Gmail API
1. Search for "Gmail API"
2. Click on "Gmail API"
3. Click "ENABLE"
4. Wait for activation (~10 seconds)

---

## Step 3: Create OAuth 2.0 Credentials

### 3.1 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (for testing)
3. Click "CREATE"

**Fill in the form:**
- App name: `S.E.A.D. Approval System`
- User support email: `your-email@gmail.com`
- Developer contact: `your-email@gmail.com`
- Click "SAVE AND CONTINUE"

**Scopes:**
- Click "ADD OR REMOVE SCOPES"
- Search and add:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.modify`
- Click "UPDATE"
- Click "SAVE AND CONTINUE"

**Test users:**
- Click "ADD USERS"
- Add your Gmail address
- Click "ADD"
- Click "SAVE AND CONTINUE"

### 3.2 Create OAuth Client ID
1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "SEAD Web Client"

**Authorized redirect URIs:**
- Click "ADD URI"
- Add: `http://localhost:3000/api/gmail/callback`
- For production, also add: `https://yourdomain.com/api/gmail/callback`
- Click "CREATE"

### 3.3 Save Credentials
You'll see a popup with:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `xxxxx`

**IMPORTANT:** Copy these values!

---

## Step 4: Configure Environment Variables

### 4.1 Update .env.local

Add these lines to your `.env.local` file:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# For production, use your domain:
# GMAIL_REDIRECT_URI=https://yourdomain.com/api/gmail/callback
```

### 4.2 Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## Step 5: Install Dependencies

```bash
npm install googleapis
```

---

## Step 6: Connect Gmail Account

### 6.1 Get Authorization URL

**API Request:**
```bash
GET http://localhost:3000/api/gmail/auth
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 6.2 Authorize Access
1. Copy the `authUrl` from response
2. Open in browser
3. Select your Google account
4. Click "Continue" (you'll see a warning - this is normal for testing)
5. Click "Continue" again
6. Review permissions
7. Click "Allow"

### 6.3 Verify Connection
You'll be redirected to:
```
http://localhost:3000/dashboard?success=gmail_connected
```

---

## Step 7: Test Gmail Integration

### 7.1 List Emails with Attachments

**API Request:**
```bash
POST http://localhost:3000/api/gmail/emails
Content-Type: application/json

{
  "action": "list",
  "maxResults": 10
}
```

**Response:**
```json
{
  "success": true,
  "emails": [
    {
      "id": "18d1234567890",
      "subject": "Invoice #12345",
      "from": "vendor@example.com",
      "date": "2026-03-01",
      "attachments": [
        {
          "filename": "invoice.pdf",
          "size": 125000
        }
      ]
    }
  ]
}
```

### 7.2 Download Attachment

**API Request:**
```bash
POST http://localhost:3000/api/gmail/emails
Content-Type: application/json

{
  "action": "download",
  "messageId": "18d1234567890",
  "attachmentId": "ANGjdJ..."
}
```

### 7.3 Send Email

**API Request:**
```bash
POST http://localhost:3000/api/gmail/send
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Document from S.E.A.D.",
  "body": "<h1>Your requested document</h1><p>Please find attached...</p>",
  "attachments": [
    {
      "filename": "document.pdf",
      "documentId": "doc_id_here"
    }
  ]
}
```

---

## Features

### 1. Auto-Save Email Attachments

**How it works:**
1. System monitors your inbox
2. When email with attachment arrives
3. Automatically downloads attachment
4. Creates document record
5. Notifies relevant users

**Configuration:**
```typescript
// Enable auto-save for specific email addresses
const autoSaveConfig = {
  enabled: true,
  fromAddresses: [
    'vendor@example.com',
    'supplier@example.com'
  ],
  categories: ['Invoice', 'Purchase Order']
};
```

### 2. Send Documents via Email

**How it works:**
1. User selects document
2. Clicks "Send via Email"
3. Enters recipient email
4. System sends email with attachment
5. Logs the action

### 3. Email Monitoring

**How it works:**
1. System checks inbox every 5 minutes
2. Looks for emails with attachments
3. Processes new emails automatically
4. Creates audit trail

---

## Security Best Practices

### 1. Token Storage
- ✅ Tokens stored encrypted in database
- ✅ Refresh tokens used for long-term access
- ✅ Access tokens expire after 1 hour

### 2. Access Control
- ✅ Only authorized users can connect Gmail
- ✅ Each user has their own Gmail connection
- ✅ Tokens not shared between users

### 3. Audit Logging
- ✅ All email operations logged
- ✅ Track who accessed what email
- ✅ Monitor attachment downloads

---

## Troubleshooting

### Error: "Gmail API credentials not configured"

**Solution:** Add credentials to `.env.local`:
```env
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
```

### Error: "Access blocked: This app's request is invalid"

**Solution:** Add your email to test users:
1. Go to OAuth consent screen
2. Add your email under "Test users"
3. Try authorization again

### Error: "Redirect URI mismatch"

**Solution:** Update authorized redirect URIs:
1. Go to Credentials
2. Edit OAuth client
3. Add exact redirect URI: `http://localhost:3000/api/gmail/callback`

### Error: "Token expired"

**Solution:** Tokens refresh automatically. If issue persists:
1. Disconnect Gmail
2. Reconnect Gmail
3. Authorize again

---

## Rate Limits

Gmail API has generous free limits:
- **Quota:** 1 billion units per day
- **Per user:** 250 units per second
- **Typical usage:**
  - List emails: 5 units
  - Get email: 5 units
  - Send email: 100 units
  - Download attachment: 5 units

**Example:** You can process ~200 million emails per day for FREE!

---

## Production Deployment

### 1. Update Redirect URI
```env
GMAIL_REDIRECT_URI=https://yourdomain.com/api/gmail/callback
```

### 2. Add Production URI to Google Cloud
1. Go to Credentials
2. Edit OAuth client
3. Add production URI
4. Save

### 3. Publish OAuth Consent Screen
1. Go to OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification (optional)

---

## Next Steps

1. ✅ Set up Gmail API credentials
2. ✅ Connect your Gmail account
3. ✅ Test email listing
4. ✅ Test attachment download
5. ✅ Configure auto-save rules
6. ✅ Set up email monitoring

---

## Support

For issues:
1. Check Google Cloud Console for API errors
2. Review audit logs: `/api/audit?action=document_upload`
3. Check server logs for Gmail API errors
4. Verify credentials in `.env.local`

---

## Cost

**Gmail API:** 100% FREE
- No credit card required
- No usage limits for typical use
- No hidden costs

**Total Cost:** $0
