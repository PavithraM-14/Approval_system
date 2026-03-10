# Documents Feature - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Server
```bash
cd approval_system
npm run dev
```
✅ Server is already running at: http://localhost:3000

### 2. Login
- Go to: http://localhost:3000/login
- Email: `requester@gmail.com`
- Password: `password123`

### 3. Access Documents
- Click "Documents" in the sidebar (below "Queries")
- You'll see the Document Library page

## 📋 What You'll See

### Document Library Page
```
┌─────────────────────────────────────────────────────────┐
│ Document Library                                        │
│ Centralized repository for all organizational documents │
│ and request attachments                                 │
├─────────────────────────────────────────────────────────┤
│ [Search Box] [Search] [Filters]                        │
│                                                         │
│ [New Folder] [Upload Document]                         │
├─────────────────────────────────────────────────────────┤
│ Documents (25)                                          │
├─────────────────────────────────────────────────────────┤
│ Name              Category    Size    Uploaded By  Date │
│ ─────────────────────────────────────────────────────── │
│ 📄 Equipment      [Request    2.5MB   Raj         Jan 15│
│    Purchase       Attachment]                           │
│    [Request #100000] [approved]                         │
│                                                         │
│ 📄 Software       [Request    1.8MB   Raj         Jan 14│
│    License        Attachment]                           │
│    [Request #100001] [pending]                          │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Features to Test

### 1. Search
- Type in search box: "Equipment"
- Press Enter or click Search
- Results filter to matching documents

### 2. Filters
- Click "Filters" button
- Try filtering by:
  - Department: "Computer Science"
  - Category: "Request Attachment"
  - Status: "Active"

### 3. Download
- Click "Download" on any document
- File downloads to your computer

### 4. Request Attachments
Look for documents with:
- 🔵 Blue badge showing "Request #100000"
- 🟢 Green badge showing "approved"
- Category: "Request Attachment"

## 👥 Test with Different Users

### Requester
```
Email: requester@gmail.com
Password: password123
Can see: Own requests + shared documents
```

### Manager
```
Email: institution_manager@gmail.com
Password: password123
Can see: Department documents + request attachments
```

### Dean
```
Email: dean@gmail.com
Password: password123
Can see: All documents + request attachments
```

### Chairman
```
Email: chairman@gmail.com
Password: password123
Can see: All documents + request attachments
```

## ✅ Expected Results

### What Should Work
1. ✅ Documents page loads without errors
2. ✅ Request attachments appear in the list
3. ✅ Search finds documents by title/keywords
4. ✅ Filters narrow down results
5. ✅ Downloads work
6. ✅ Request badges show correctly
7. ✅ All users can access Documents section

### Sample Documents You Should See
Based on seeded data, you should see approximately:
- 25+ documents (from request attachments)
- Various categories: Request Attachment, Equipment, etc.
- Multiple departments: Computer Science, Mechanical, etc.
- Different statuses: approved, pending, rejected

## 🎯 Key Features

### 1. Unified View
- Standalone documents + Request attachments in one place
- No need to go to individual requests to find files

### 2. Rich Metadata
- Request ID for attachments
- Request status (approved/rejected/pending)
- Uploader information
- Upload date
- File size and type

### 3. Powerful Search
- Search by document title
- Search by request ID
- Search by keywords
- Search by tags

### 4. Smart Filtering
- Filter by department
- Filter by category
- Filter by status
- Filter by tags

### 5. Easy Access
- All roles can access
- Department-based visibility
- One-click downloads

## 🐛 Troubleshooting

### No Documents Showing
- Check MongoDB connection
- Verify database is seeded: `npx tsx scripts/seed.ts`
- Check browser console for errors

### Search Not Working
- Make sure search query is not empty
- Try different search terms
- Check if documents have searchable content

### Download Fails
- Verify files exist in `public/uploads`
- Check browser console for errors
- Try different document

### Page Won't Load
- Check if server is running
- Verify no TypeScript errors
- Check browser console

## 📞 Quick Commands

### Reseed Database
```bash
npx tsx scripts/seed.ts
```

### Test Connection
```bash
npx tsx scripts/test-connection.ts
```

### Restart Server
```bash
# Stop: Ctrl+C
# Start: npm run dev
```

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ Documents page loads
2. ✅ You see documents with "Request Attachment" category
3. ✅ Blue badges show Request IDs
4. ✅ Status badges show request status
5. ✅ Search returns results
6. ✅ Downloads work
7. ✅ No console errors

## 📊 What's Included

### From Seeded Database
- 25 approval requests
- Multiple request attachments
- Various departments and categories
- Different request statuses
- Multiple user roles

### Document Types
1. **Request Attachments** (from approval requests)
   - Automatically included
   - Tagged with request ID
   - Shows request status

2. **Standalone Documents** (uploaded directly)
   - Full metadata
   - Folder organization
   - Custom categories

## 🎨 Visual Guide

### Request Attachment Badge
```
┌────────────────────────────────────┐
│ 📄 Equipment Purchase - Attachment │
│    invoice.pdf                     │
│    [Request #100000] [approved]    │
└────────────────────────────────────┘
```

### Category Badge Colors
- 🔵 Blue: Request Attachment
- 🟣 Purple: Policy
- 🟢 Green: Report
- ⚪ Gray: Other

### Status Badge Colors
- 🟢 Green: Approved
- 🔴 Red: Rejected
- 🟡 Yellow: Pending

## ✨ That's It!

The Documents feature is fully functional and ready to use. All users can now access a centralized repository of documents including request attachments with powerful search and filtering capabilities.

**Happy Testing! 🎉**
