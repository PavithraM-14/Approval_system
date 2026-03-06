# Gmail Integration Guide

## Overview
Your S.E.A.D. system now has Gmail integration that allows you to:
1. **Import documents from Gmail** - Extract email attachments and save them to your document library
2. **Send documents via Gmail** - Email documents directly from the system

## Setup Required

### 1. Connect Gmail Account

Before using Gmail features, users must connect their Gmail account:

```
1. Go to Dashboard
2. Click "Connect Gmail" button (you need to add this button)
3. Authorize the application
4. You'll be redirected back to the dashboard
```

The system stores Gmail tokens in the User model:
- `gmailAccessToken`
- `gmailRefreshToken`
- `gmailTokenExpiry`

### 2. Environment Variables

Make sure these are set in `.env.local`:

```env
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

## How to Use

### Import Documents from Gmail (Email → Website)

**API Endpoint:** `GET /api/gmail/import`

**What it does:**
- Lists recent emails with attachments from your Gmail
- Shows email subject, sender, date, and all attachments
- Allows you to select which attachments to import

**Steps:**
1. User clicks "Import from Gmail" button
2. Modal opens showing recent emails with attachments
3. User selects attachments they want to import
4. User sets department and category
5. Click "Import Selected"
6. Attachments are downloaded and saved as documents

**API Call:**
```typescript
// List emails
GET /api/gmail/import?maxResults=20

// Import selected attachments
POST /api/gmail/import
Body: {
  messageId: "email_id",
  attachmentIds: ["attachment_id_1", "attachment_id_2"],
  department: "IT",
  category: "Email Import",
  tags: ["gmail-import"]
}
```

**What happens:**
- Files are saved to `uploads/gmail-imports/`
- Document records are created in MongoDB
- Documents are tagged with "gmail-import"
- Keywords include email subject, sender, and filename

### Send Documents via Gmail (Website → Email)

**API Endpoint:** `POST /api/documents/send-email`

**What it does:**
- Sends a document as an email attachment via Gmail
- Uses professional HTML email template
- Includes document details and custom message

**Steps:**
1. User clicks "Send via Email" button on a document
2. Modal opens with email form
3. User enters:
   - Recipient email address
   - Subject (pre-filled with document title)
   - Optional personal message
4. Click "Send Email"
5. Document is sent as attachment

**API Call:**
```typescript
POST /api/documents/send-email
Body: {
  documentId: "doc_id",
  to: "recipient@example.com",
  subject: "Document: Report.pdf",
  message: "Please review this document"
}
```

**Email includes:**
- Professional HTML template
- Document details (title, filename, size, description)
- Custom message from sender
- Document attached
- Sender information

## Adding UI Buttons

### Option 1: Add to Documents Page Header

Add these buttons near the search bar in `app/dashboard/documents/page.tsx`:

```tsx
import GmailImportModal from '@/components/GmailImportModal';
import SendEmailModal from '@/components/SendEmailModal';
import { EnvelopeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// Add state
const [showGmailImport, setShowGmailImport] = useState(false);
const [showSendEmail, setShowSendEmail] = useState(false);
const [selectedDocForEmail, setSelectedDocForEmail] = useState<Document | null>(null);

// Add buttons in the header section
<div className="flex gap-3">
  <button
    onClick={() => setShowGmailImport(true)}
    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
  >
    <ArrowDownTrayIcon className="h-5 w-5" />
    Import from Gmail
  </button>
  
  {/* Other buttons... */}
</div>

// Add modals at the end
<GmailImportModal
  isOpen={showGmailImport}
  onClose={() => setShowGmailImport(false)}
  onImportComplete={() => fetchData()}
/>

<SendEmailModal
  isOpen={showSendEmail}
  onClose={() => {
    setShowSendEmail(false);
    setSelectedDocForEmail(null);
  }}
  documentId={selectedDocForEmail?._id || ''}
  documentTitle={selectedDocForEmail?.title || ''}
/>
```

### Option 2: Add "Send via Email" to Document Actions

In the document card actions (where Download and Share buttons are):

```tsx
<button
  onClick={() => {
    setSelectedDocForEmail(doc);
    setShowSendEmail(true);
  }}
  className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
>
  <EnvelopeIcon className="h-4 w-4" />
  Send via Email
</button>
```

## For Hackathon Demo

### Demo Script:

**1. Import from Gmail:**
```
"Let me show you how we can import documents directly from email.
I click 'Import from Gmail', and here are my recent emails with attachments.
I select this invoice attachment, set the department to Finance,
and click Import. Now it's in our document library with full search and access control."
```

**2. Send via Email:**
```
"Now let's share this document via email. I click 'Send via Email',
enter the recipient's address, add a message, and send.
The document is sent as an attachment with a professional email template
directly from my Gmail account."
```

### What to Say to Judges:

"Our system integrates with Gmail to streamline document workflows:
- Users can import email attachments directly into the document library
- Documents can be sent via email with professional templates
- All actions are audited and tracked
- Gmail OAuth ensures secure access
- This eliminates the need to download attachments and re-upload them"

## Technical Details

### Files Created:
1. `app/api/documents/send-email/route.ts` - Send documents via Gmail
2. `app/api/gmail/import/route.ts` - List and import email attachments
3. `components/GmailImportModal.tsx` - UI for importing from Gmail
4. `components/SendEmailModal.tsx` - UI for sending documents via email

### Existing Files Used:
- `lib/gmail-service.ts` - Gmail API functions (already existed)
- `app/api/gmail/auth/route.ts` - OAuth initiation (already existed)
- `app/api/gmail/callback/route.ts` - OAuth callback (already existed)

### Security:
- OAuth2 authentication with Google
- Tokens stored securely in database
- Access control checks before sending
- Audit logging for all actions

## Troubleshooting

**Error: "Gmail not connected"**
- User needs to connect their Gmail account first
- Add a "Connect Gmail" button that redirects to `/api/gmail/auth`

**Error: "Failed to send email"**
- Check Gmail API credentials in `.env.local`
- Verify user has valid Gmail tokens
- Check if tokens need refresh

**Error: "No emails found"**
- User's Gmail might not have emails with attachments
- Try changing the search query parameter

## Next Steps (Optional Enhancements)

1. **Auto-monitoring:** Add cron job to automatically check Gmail every 5 minutes
2. **Smart linking:** Automatically link emails to requests based on subject line (e.g., "RE: Request #123456")
3. **Bulk import:** Allow importing all attachments from multiple emails at once
4. **Email templates:** Create custom email templates for different document types
5. **Read receipts:** Track when recipients open emails
