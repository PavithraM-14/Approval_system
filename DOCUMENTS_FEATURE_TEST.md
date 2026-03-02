# Documents Feature - Testing Guide

## Overview
The Documents section has been enhanced to show ALL documents including request attachments, accessible to all user roles.

## Features Implemented

### 1. Unified Document Library
- **Standalone Documents**: Documents uploaded directly to the library
- **Request Attachments**: All files attached to approval requests
- **Combined View**: Both types shown in a single interface

### 2. Access Control
- **All Roles**: Every user role can access the Documents section
- **Department-Based**: Users see documents from their department
- **Request Attachments**: All request attachments are visible to authorized users

### 3. Search & Filter Capabilities
- **Full-Text Search**: Search by title, description, filename, tags, keywords
- **Department Filter**: Filter by specific department
- **Category Filter**: Filter by document category (Policy, Report, Request Attachment, etc.)
- **Status Filter**: Active, Archived, Draft
- **Tags Filter**: Search by comma-separated tags

### 4. Metadata & Information
Each document shows:
- Title and filename
- Category (with color-coded badges)
- File size
- Uploaded by (user name)
- Upload date
- For request attachments:
  - Request ID badge
  - Request status badge (approved/rejected/pending)

### 5. Download Functionality
- Direct download links for all documents
- Request attachments use the existing download API
- Standalone documents use the documents API

## Testing Steps

### Step 1: Login
1. Go to http://localhost:3000/login
2. Login with any test user:
   - Email: `requester@gmail.com`
   - Password: `password123`

### Step 2: Navigate to Documents
1. Click on "Documents" in the sidebar
2. You should see the Document Library page

### Step 3: Verify Request Attachments
1. The page should show documents with "Request Attachment" category
2. These should have blue badges showing Request ID
3. Request status should be visible (approved/rejected/pending)

### Step 4: Test Search
1. Use the search bar to search for:
   - Document titles
   - Keywords
   - Tags
   - Request IDs

### Step 5: Test Filters
1. Click "Filters" button
2. Try filtering by:
   - Department (e.g., "Computer Science")
   - Category (select from dropdown)
   - Status (Active/Archived/Draft)
   - Tags (comma-separated)

### Step 6: Test Download
1. Click "Download" on any document
2. File should download successfully

### Step 7: Test with Different Roles
1. Logout and login with different roles:
   - `institution_manager@gmail.com`
   - `dean@gmail.com`
   - `chairman@gmail.com`
2. Verify all can access Documents section
3. Verify they see appropriate documents

## API Endpoints

### GET /api/documents
**Query Parameters:**
- `department` - Filter by department
- `category` - Filter by category
- `status` - Filter by status (default: active)
- `tags` - Comma-separated tags
- `search` - Full-text search query
- `includeRequestAttachments` - Include request attachments (default: true)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response:**
```json
{
  "documents": [
    {
      "_id": "...",
      "title": "Document Title",
      "fileName": "file.pdf",
      "category": "Request Attachment",
      "isRequestAttachment": true,
      "requestId": "100000",
      "requestStatus": "approved",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

## Expected Results

### ✅ What Should Work
1. All users can access Documents section
2. Request attachments appear with proper metadata
3. Search works across all document fields
4. Filters work correctly
5. Downloads work for both document types
6. Request ID and status badges display correctly
7. Category badges are color-coded
8. Pagination works for large document sets

### 📊 Sample Data
The seeded database includes:
- 25 approval requests (many with attachments)
- Request attachments should automatically appear in Documents
- All attachments are tagged with request ID

## Troubleshooting

### No Documents Showing
- Check if requests have attachments in the database
- Verify MongoDB connection
- Check browser console for errors

### Search Not Working
- Ensure search query is not empty
- Try different search terms
- Check if documents have searchable content

### Download Fails
- Verify file paths are correct
- Check if files exist in public/uploads
- Ensure download API is working

## Technical Details

### Document Structure
```typescript
interface Document {
  _id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileType: string;
  department: string;
  category: string;
  tags: string[];
  uploadedBy: { name: string; email: string };
  createdAt: string;
  isRequestAttachment?: boolean;  // NEW
  requestId?: string;              // NEW
  requestStatus?: string;          // NEW
}
```

### Key Changes Made
1. **API Enhancement**: `/api/documents` now fetches request attachments
2. **UI Update**: Documents page shows request metadata
3. **Navigation**: Documents link added to sidebar for all roles
4. **Access Control**: All roles can view documents
5. **Search**: Enhanced to include request attachments

## Next Steps (Optional Enhancements)

1. **File Preview**: Add inline preview for PDFs and images
2. **Bulk Download**: Allow downloading multiple files
3. **Advanced Filters**: Add date range, file type filters
4. **Upload UI**: Improve document upload interface
5. **Folder Management**: Better folder organization
6. **Version Control**: Track document versions
7. **Permissions**: Fine-grained access control per document

## Verification Checklist

- [ ] Server starts without errors
- [ ] Documents page loads successfully
- [ ] Request attachments are visible
- [ ] Search functionality works
- [ ] Filters work correctly
- [ ] Downloads work
- [ ] All user roles can access
- [ ] Request badges display correctly
- [ ] Category badges are color-coded
- [ ] Pagination works

## Success Criteria

The feature is working correctly if:
1. ✅ All users can access Documents section
2. ✅ Request attachments appear alongside standalone documents
3. ✅ Search and filters work as expected
4. ✅ Downloads work for all document types
5. ✅ Metadata displays correctly
6. ✅ No console errors
7. ✅ Performance is acceptable (loads within 2-3 seconds)
