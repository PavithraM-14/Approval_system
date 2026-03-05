# How to Add "Send via Email" Button to Request Details Page

## Quick Instructions

The `SendRequestAttachmentsButton` component is ready to use. Just add it to your request details page.

### Step 1: Import the Component

At the top of `app/dashboard/requests/[id]/page.tsx`, add:

```typescript
import SendRequestAttachmentsButton from '../../../../components/SendRequestAttachmentsButton';
```

### Step 2: Add the Button

Find a good location in the UI (near the request details or attachments section) and add:

```tsx
{request && (
  <SendRequestAttachmentsButton
    requestId={request._id}
    requestTitle={request.title}
    attachments={request.attachments || []}
  />
)}
```

## Suggested Locations

### Option 1: Near the Request Header
Add it in the header section with other action buttons:

```tsx
<div className="flex gap-3">
  {/* Other buttons... */}
  
  <SendRequestAttachmentsButton
    requestId={request._id}
    requestTitle={request.title}
    attachments={request.attachments || []}
  />
</div>
```

### Option 2: In the Attachments Section
If there's a section showing attachments, add it there:

```tsx
<div className="attachments-section">
  <h3>Attachments</h3>
  
  {/* List of attachments... */}
  
  <SendRequestAttachmentsButton
    requestId={request._id}
    requestTitle={request.title}
    attachments={request.attachments || []}
    className="mt-4"
  />
</div>
```

### Option 3: In the Action Buttons Area
Add it with Approve/Reject buttons:

```tsx
<div className="action-buttons flex gap-3">
  <button>Approve</button>
  <button>Reject</button>
  
  <SendRequestAttachmentsButton
    requestId={request._id}
    requestTitle={request.title}
    attachments={request.attachments || []}
  />
</div>
```

## How It Works

The button automatically:
- Shows nothing if there are no attachments
- Shows a direct "Send via Email" button if there's 1 attachment
- Shows a dropdown menu if there are multiple attachments
- Opens the email modal when an attachment is selected
- Sends the attachment via Gmail using the user's connected account

## Features

- ✅ Handles single or multiple attachments
- ✅ Dropdown menu for multiple attachments
- ✅ Professional email template
- ✅ Works with request attachments (not just documents)
- ✅ Requires Gmail connection
- ✅ Full audit trail

## Example

```tsx
// Somewhere in your request details page JSX:
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold mb-4">{request.title}</h2>
  
  <div className="space-y-4">
    {/* Request details... */}
  </div>
  
  {/* Add the button here */}
  <div className="mt-6 flex justify-end">
    <SendRequestAttachmentsButton
      requestId={request._id}
      requestTitle={request.title}
      attachments={request.attachments || []}
    />
  </div>
</div>
```

That's it! The button is fully functional and ready to use.
