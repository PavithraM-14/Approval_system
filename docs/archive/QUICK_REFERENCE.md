# Gmail Integration - Quick Reference Card

## ✅ What's Done

### Documents Page
- Green "Import from Gmail" button (top right)
- Purple "Email" button on each document

### Create Request Page  
- Green "Import from Gmail" link (in Documents section)

### Request Details Page
- Component ready: `SendRequestAttachmentsButton`
- **You need to add it** (1 line of code)

## 🎯 How to Add to Request Details

Open `app/dashboard/requests/[id]/page.tsx` and add:

```typescript
// 1. Import at top
import SendRequestAttachmentsButton from '../../../../components/SendRequestAttachmentsButton';

// 2. Add in JSX (anywhere you want the button)
<SendRequestAttachmentsButton
  requestId={request._id}
  requestTitle={request.title}
  attachments={request.attachments || []}
/>
```

That's it!

## 🔑 Environment Variables Needed

```env
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

## 🎬 Demo Flow

1. **Import from Gmail:**
   - Documents page → "Import from Gmail" → Select attachments → Import
   
2. **Send via Email:**
   - Documents page → Click "Email" on any document → Enter recipient → Send

3. **Import to Request:**
   - Create Request → "Import from Gmail" → Select attachments → Auto-added

## 📦 What You Get

- Import email attachments (4 clicks)
- Send documents via email (3 clicks)
- Professional email templates
- Full audit trail
- OAuth2 security

## 🚀 Ready to Demo!

All features are working. Just add the button to request details page and you're done!
