# Where Is The Integration?

## Exact Location

The integration button appears on the **Request Detail Page** - the page you see when you click on any request.

---

## Visual Guide

### Step 1: Go to Dashboard
```
Your Dashboard
├── My Requests (if you're a requester)
├── Approvals (if you're an approver)
└── Documents
```

### Step 2: Click Any Request
```
My Requests List:
┌─────────────────────────────────────┐
│ #123456 - Buy Office Supplies       │ ← Click here
├─────────────────────────────────────┤
│ #123457 - Repair Equipment          │
├─────────────────────────────────────┤
│ #123458 - Software License          │
└─────────────────────────────────────┘
```

### Step 3: You'll See This Page

```
┌──────────────────────────────────────────────────────┐
│  ← Back to My Requests                                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Request #123456                                      │
│  Buy Office Supplies                                  │
│                                                       │
│  Request Information:                                 │
│  - ID: 123456                                        │
│  - Requester: John Doe                               │
│  - Department: Computer Science                       │
│  - Cost: ₹5,000                                      │
│                                                       │
│  Attachments:                                         │
│  📄 invoice.pdf                                      │
│  📄 quotation.xlsx                                   │
│                                                       │
│  ┌────────────────────────────────┐                 │
│  │  🔗 Link to ERP/CRM/HR         │  ← HERE IT IS!  │
│  └────────────────────────────────┘                 │
│                                                       │
│  [Process Request]  [Raise Query]                    │
│                                                       │
│  Approval History:                                    │
│  ✓ Submitted by John Doe                            │
│  ✓ Approved by Department Head                       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## What Happens When You Click It?

### A Modal Opens:

```
┌──────────────────────────────────────────────────────┐
│  Link to External System                       [X]   │
├──────────────────────────────────────────────────────┤
│  [Odoo ERP]  [SuiteCRM]  [OrangeHRM]                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Choose what to link:                                │
│                                                       │
│  Purchase Orders:                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ PO00042                                       │   │
│  │ ACME Corp • ₹5,000                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ PO00043                                       │   │
│  │ XYZ Supplies • ₹3,500                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  Invoices:                                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ INV-2024-001                                  │   │
│  │ ACME Corp • ₹5,000                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## File Location (For Developers)

The button is added in:
```
app/dashboard/requests/[id]/page.tsx
```

At line ~920, right after the AttachmentList component.

---

## Who Can See It?

**Everyone** who can view the request:
- Requester
- Approvers
- Administrators

---

## When Does It Appear?

**Always** - on every request detail page, regardless of status:
- Submitted requests
- Approved requests
- Rejected requests
- Pending requests

---

## What If I Don't See It?

### Possible Reasons:

1. **You're on the wrong page**
   - Make sure you clicked on a specific request
   - You should see the full request details

2. **Code not updated**
   - Restart your dev server: `npm run dev`
   - Clear browser cache: Ctrl+Shift+R

3. **Component not imported**
   - Check if IntegrationLinks is imported in the file

---

## Navigation Path

```
Home Page
  ↓
Login
  ↓
Dashboard
  ↓
My Requests / Approvals
  ↓
Click on any request
  ↓
Request Detail Page ← YOU ARE HERE
  ↓
Scroll down past attachments
  ↓
See "Link to ERP/CRM/HR" button ← THIS IS IT!
```

---

## Quick Test

1. Start your app: `npm run dev`
2. Login to your account
3. Go to "My Requests" or "Approvals"
4. Click on ANY request
5. Scroll down
6. Look for the blue button after attachments

**That's it!**

---

## Summary

**Page:** Request Detail Page (when viewing a specific request)
**Location:** After attachments, before action buttons
**Looks like:** Blue button saying "Link to ERP/CRM/HR"
**Who sees it:** Everyone who can view the request
**When:** Always visible on all requests

