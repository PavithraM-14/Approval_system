# Document Library Feature

## Overview
The Document Library is a centralized repository for all organizational documents with advanced search, metadata management, and role-based access control. It provides a common access folder structure organized by departments and projects with full-text indexing and keyword-based search.

## Features

### 1. Centralized Document Storage
- **Hierarchical Folder Structure**: Organize documents by department, project, and custom folders
- **File Upload**: Support for multiple file types (PDF, DOC, XLS, PPT, images, etc.)
- **Metadata Management**: Rich metadata including title, description, tags, keywords, category
- **Version Control**: Track document versions
- **File Information**: Automatic capture of file size, type, MIME type

### 2. Advanced Search & Filtering
- **Full-Text Search**: Search across title, description, keywords, and content
- **Metadata Filters**:
  - Department
  - Project
  - Category (Policy, Procedure, Form, Report, Contract, etc.)
  - Status (Active, Draft, Archived, Deleted)
  - Tags
  - File Type
  - Date Range
  - File Size Range
  - Uploaded By
- **Search Relevance**: Weighted text search with relevance scoring
- **Sort Options**: Sort by date, name, size, downloads, views

### 3. Access Control & Permissions
- **Role-Based Access**: Documents visible based on user role
- **Department-Based Access**: Users see documents from their department
- **Granular Permissions**:
  - View: Can see document details
  - Edit: Can modify metadata
  - Download: Can download file
  - Delete: Can remove document
- **Public/Private**: Mark documents as public or restrict access
- **Sharing**: Share with specific users, roles, or departments

### 4. Document Categories
- Policy
- Procedure
- Form
- Report
- Contract
- Invoice
- Receipt
- Proposal
- Presentation
- Spreadsheet
- Image
- Other

### 5. Audit & Analytics
- **Download Tracking**: Count of downloads per document
- **View Tracking**: Count of views per document
- **Last Accessed**: Timestamp of last access
- **Upload History**: Track who uploaded what and when

## Database Schema

### Document Model
```typescript
{
  title: string,                    // Document title
  description: string,              // Optional description
  fileName: string,                 // Original filename
  filePath: string,                 // Storage path
  fileSize: number,                 // Size in bytes
  fileType: string,                 // File extension
  mimeType: string,                 // MIME type
  
  // Organization
  department: string,               // Department
  project: string,                  // Optional project
  category: string,                 // Document category
  
  // Metadata
  tags: string[],                   // Tags for categorization
  keywords: string[],               // Keywords for search
  status: string,                   // draft | active | archived | deleted
  version: number,                  // Version number
  
  // Access Control
  uploadedBy: ObjectId,             // User who uploaded
  sharedWith: [{
    userId: ObjectId,               // Specific user
    role: string,                   // Or role
    department: string,             // Or department
    permissions: string[]           // view, edit, download, delete
  }],
  isPublic: boolean,                // Public access
  
  // Relations
  requestId: ObjectId,              // Optional linked request
  parentFolder: ObjectId,           // Parent folder
  
  // Search
  searchableContent: string,        // Full-text search content
  
  // Audit
  downloadCount: number,            // Download count
  viewCount: number,                // View count
  lastAccessedAt: Date,             // Last access timestamp
  
  createdAt: Date,
  updatedAt: Date
}
```

### Folder Model
```typescript
{
  name: string,                     // Folder name
  description: string,              // Optional description
  department: string,               // Department
  project: string,                  // Optional project
  parentFolder: ObjectId,           // Parent folder
  path: string,                     // Full path
  
  // Access Control
  createdBy: ObjectId,              // Creator
  sharedWith: [{
    userId: ObjectId,
    role: string,
    department: string,
    permissions: string[]           // view, edit, upload, delete
  }],
  isPublic: boolean,
  
  // Metadata
  tags: string[],
  color: string,                    // UI color
  icon: string,                     // UI icon
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```typescript
// Document indexes
{ department: 1, status: 1, createdAt: -1 }
{ uploadedBy: 1, status: 1 }
{ tags: 1, status: 1 }
{ project: 1, status: 1 }

// Text index for full-text search
{
  title: 'text',
  description: 'text',
  keywords: 'text',
  searchableContent: 'text'
}

// Folder indexes
{ department: 1, parentFolder: 1 }
{ path: 1 } // unique
```

## API Endpoints

### Documents

#### GET `/api/documents`
List documents with filtering and pagination.

**Query Parameters:**
- `department` - Filter by department
- `project` - Filter by project
- `category` - Filter by category
- `status` - Filter by status (default: active)
- `tags` - Comma-separated tags
- `folderId` - Filter by parent folder
- `search` - Full-text search query
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "documents": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### POST `/api/documents`
Upload a new document.

**Request:** multipart/form-data
- `file` - File to upload (required)
- `title` - Document title
- `description` - Description
- `department` - Department (required)
- `project` - Project name
- `category` - Document category
- `tags` - Comma-separated tags
- `keywords` - Comma-separated keywords
- `folderId` - Parent folder ID
- `isPublic` - Public access (true/false)
- `sharedWith` - JSON array of sharing rules

**Response:**
```json
{
  "success": true,
  "document": {...}
}
```

#### GET `/api/documents/[id]`
Get document details or download file.

**Query Parameters:**
- `action` - "view" (default) or "download"

**Response:**
- If action=view: JSON with document metadata
- If action=download: File download

#### PATCH `/api/documents/[id]`
Update document metadata.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["tag1", "tag2"],
  "keywords": ["keyword1", "keyword2"],
  "category": "Report",
  "status": "active",
  "isPublic": true,
  "sharedWith": [...]
}
```

#### DELETE `/api/documents?id={id}`
Delete a document (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### GET `/api/documents/search`
Advanced document search.

**Query Parameters:**
- `query` - Search query
- `department` - Filter by department
- `project` - Filter by project
- `category` - Filter by category
- `status` - Filter by status
- `tags` - Comma-separated tags
- `fileType` - Filter by file type
- `uploadedBy` - Filter by uploader
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)
- `minSize` - Minimum file size (bytes)
- `maxSize` - Maximum file size (bytes)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - asc or desc (default: desc)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "documents": [...],
  "pagination": {...},
  "stats": {
    "totalSize": 1048576,
    "totalDownloads": 150,
    "totalViews": 300,
    "categories": ["Policy", "Report"],
    "fileTypes": ["PDF", "DOCX"]
  },
  "query": {...}
}
```

### Folders

#### GET `/api/folders`
List folders.

**Query Parameters:**
- `department` - Filter by department
- `project` - Filter by project
- `parentId` - Filter by parent folder (null for root)

**Response:**
```json
{
  "folders": [...]
}
```

#### POST `/api/folders`
Create a new folder.

**Request Body:**
```json
{
  "name": "Folder Name",
  "description": "Optional description",
  "department": "Engineering",
  "project": "Project Alpha",
  "parentId": "parent_folder_id",
  "isPublic": true,
  "sharedWith": [...],
  "tags": ["tag1", "tag2"],
  "color": "#3B82F6",
  "icon": "folder"
}
```

#### DELETE `/api/folders?id={id}`
Delete a folder.

**Response:**
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

## Usage Examples

### Upload a Document
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Annual Report 2024');
formData.append('description', 'Financial report for 2024');
formData.append('department', 'Finance');
formData.append('category', 'Report');
formData.append('tags', 'annual,finance,2024');
formData.append('keywords', 'revenue,expenses,profit');
formData.append('isPublic', 'false');

const response = await fetch('/api/documents', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

### Search Documents
```typescript
const params = new URLSearchParams({
  query: 'budget report',
  department: 'Finance',
  category: 'Report',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31'
});

const response = await fetch(`/api/documents/search?${params}`, {
  credentials: 'include'
});
const data = await response.json();
```

### Download a Document
```typescript
// Direct download link
<a href={`/api/documents/${documentId}?action=download`}>
  Download
</a>

// Or programmatically
const response = await fetch(`/api/documents/${documentId}?action=download`, {
  credentials: 'include'
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = fileName;
a.click();
```

### Create a Folder
```typescript
const response = await fetch('/api/folders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Q1 Reports',
    description: 'First quarter reports',
    department: 'Finance',
    project: 'Annual Planning',
    isPublic: false,
    sharedWith: [
      {
        role: 'accountant',
        permissions: ['view', 'download']
      }
    ]
  })
});
```

## Access Control Examples

### Share with Specific User
```json
{
  "sharedWith": [
    {
      "userId": "user_id_here",
      "permissions": ["view", "download"]
    }
  ]
}
```

### Share with Role
```json
{
  "sharedWith": [
    {
      "role": "accountant",
      "permissions": ["view", "edit", "download"]
    }
  ]
}
```

### Share with Department
```json
{
  "sharedWith": [
    {
      "department": "Finance",
      "permissions": ["view", "download"]
    }
  ]
}
```

### Make Public
```json
{
  "isPublic": true
}
```

## File Storage

### Directory Structure
```
public/
  documents/
    Engineering/
      timestamp_filename.pdf
      timestamp_report.docx
    Finance/
      timestamp_budget.xlsx
    HR/
      timestamp_policy.pdf
```

### File Naming
- Format: `{timestamp}_{sanitized_filename}`
- Example: `1703001234567_annual_report_2024.pdf`
- Sanitization: Replace special characters with underscores

## Best Practices

### 1. Document Organization
- Use consistent naming conventions
- Add descriptive titles and descriptions
- Tag documents appropriately
- Assign correct categories
- Link to related requests when applicable

### 2. Access Control
- Default to private documents
- Share only with necessary users/roles
- Review permissions regularly
- Use department-based sharing for team documents

### 3. Search Optimization
- Add relevant keywords
- Use descriptive titles
- Include searchable content in description
- Tag with multiple relevant tags

### 4. File Management
- Keep file sizes reasonable
- Use appropriate file formats
- Archive old documents
- Delete obsolete documents

### 5. Performance
- Use pagination for large result sets
- Apply filters to narrow searches
- Index frequently searched fields
- Cache common queries

## Security Considerations

- All file uploads are validated
- File paths are sanitized
- Access control enforced on all operations
- Soft delete preserves audit trail
- Download/view tracking for compliance
- Role-based permissions respected

## Future Enhancements

- [ ] Document versioning with history
- [ ] Document preview (PDF, images)
- [ ] Bulk upload
- [ ] Bulk operations (move, delete, share)
- [ ] Document templates
- [ ] OCR for scanned documents
- [ ] Document expiry/retention policies
- [ ] Document approval workflow
- [ ] Document comments/annotations
- [ ] Integration with external storage (S3, Azure Blob)
- [ ] Document encryption
- [ ] Digital signatures
- [ ] Document comparison/diff
- [ ] Advanced analytics dashboard

---

**Last Updated**: December 2024
