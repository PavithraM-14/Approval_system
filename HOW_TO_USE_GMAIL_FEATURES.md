# How to Use Gmail Features - Quick Guide

## 🎯 Two Main Features

### 1. Import Documents from Gmail (Email → Website)
**What:** Extract attachments from your Gmail and save them to the document library

**How:**
1. Add this button to your documents page:
   ```tsx
   <button onClick={() => setShowGmailImport(true)}>
     Import from Gmail
   </button>
   ```

2. Add the modal component:
   ```tsx
   import GmailImportModal from '@/components/GmailImportModal';
   
   <GmailImportModal
     isOpen={showGmailImport}
     onClose={() => setShowGmailImport(false)}
     onImportComplete={() => fetchData()}
   />
   ```

3. User flow:
   - Click "Import from Gmail"
   - See list of recent emails with attachments
   - Check boxes next to attachments to import
   - Set department and category
   - Click "Import Selected"
   - Done! Documents are now in the library

### 2. Send Documents via Email (Website → Email)
**What:** Email a document directly from the website using Gmail

**How:**
1. Add this button next to each document:
   ```tsx
   <button onClick={() => {
     setSelectedDocForEmail(doc);
     setShowSendEmail(true);
   }}>
     Send via Email
   </button>
   ```

2. Add the modal component:
   ```tsx
   import SendEmailModal from '@/components/SendEmailModal';
   
   <SendEmailModal
     isOpen={showSendEmail}
     onClose={() => setShowSendEmail(false)}
     documentId={selectedDocForEmail?._id || ''}
     documentTitle={selectedDocForEmail?.title || ''}
   />
   ```

3. User flow:
   - Click "Send via Email" on a document
   - Enter recipient email address
   - Edit subject line (pre-filled)
   - Add optional message
   - Click "Send Email"
   - Done! Email sent with document attached

## 🔧 Setup (One-Time)

### Step 1: Connect Gmail Account
Users must connect their Gmail account first. Add this button somewhere:

```tsx
<button onClick={async () => {
  const res = await fetch('/api/gmail/auth');
  const data = await res.json();
  window.location.href = data.authUrl;
}}>
  Connect Gmail
</button>
```

### Step 2: Environment Variables
Make sure these are in `.env.local`:
```env
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

## 📋 For Your Hackathon Demo

### What to Show:

**Demo 1: Import from Gmail**
1. Click "Import from Gmail"
2. Show list of emails with attachments
3. Select an invoice or document attachment
4. Import it
5. Show it now appears in the document library with search, tags, etc.

**Demo 2: Send via Email**
1. Find a document in the library
2. Click "Send via Email"
3. Enter a test email address
4. Send it
5. Check the email inbox to show it arrived with attachment

### What to Say:
"Our system eliminates the manual process of downloading email attachments and re-uploading them. Users can import documents directly from Gmail with one click, and share documents via email without leaving the platform. This streamlines document workflows and maintains our centralized repository."

## 🎨 Quick Integration Example

Here's the minimal code to add to `app/dashboard/documents/page.tsx`:

```tsx
// At the top, add imports
import GmailImportModal from '@/components/GmailImportModal';
import SendEmailModal from '@/components/SendEmailModal';
import { EnvelopeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// In your component, add state
const [showGmailImport, setShowGmailImport] = useState(false);
const [showSendEmail, setShowSendEmail] = useState(false);
const [selectedDocForEmail, setSelectedDocForEmail] = useState<Document | null>(null);

// Add button in the header (near search)
<button
  onClick={() => setShowGmailImport(true)}
  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
>
  <ArrowDownTrayIcon className="h-5 w-5" />
  Import from Gmail
</button>

// Add button for each document (in the document card)
<button
  onClick={() => {
    setSelectedDocForEmail(doc);
    setShowSendEmail(true);
  }}
  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
>
  <EnvelopeIcon className="h-4 w-4" />
  Send via Email
</button>

// At the end of your return statement, add modals
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

## ✅ That's It!

You now have:
- ✅ Import documents from Gmail
- ✅ Send documents via Gmail
- ✅ Professional email templates
- ✅ Audit logging
- ✅ Access control

All the backend APIs are ready. Just add the buttons and modals to your UI!
