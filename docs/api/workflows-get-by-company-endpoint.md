# GET /api/workflows/company/:companyId

Lists all workflows for a specific company with multi-tenant isolation enforcement.

## Endpoint

```
GET /api/workflows/company/:companyId
```

## Requirements

- **8.1**: Enforce company-level isolation for all workflow configurations
- **8.3**: Display only the user's company workflow configuration

## Authentication

**Required**: Yes

The request must include valid authentication credentials. The authenticated user must belong to the requested company.

## Authorization

The authenticated user must:
- Be associated with a company
- Belong to the same company as the requested `companyId`

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | string | Yes | MongoDB ObjectId of the company to retrieve workflows for |

## Response

### Success Response (200 OK)

Returns an array of workflow configurations for the specified company.

```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "companyId": "507f1f77bcf86cd799439011",
    "name": "Standard Approval Workflow",
    "description": "Default approval workflow for expense requests",
    "version": 1,
    "isActive": true,
    "nodes": [
      {
        "id": "start-1",
        "type": "start",
        "label": "Start",
        "position": { "x": 0, "y": 0 },
        "data": {}
      },
      {
        "id": "approval-1",
        "type": "approval",
        "label": "Manager Approval",
        "position": { "x": 100, "y": 100 },
        "data": {
          "roleId": "507f1f77bcf86cd799439014"
        }
      },
      {
        "id": "end-1",
        "type": "end",
        "label": "End",
        "position": { "x": 200, "y": 200 },
        "data": {}
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start-1",
        "target": "approval-1",
        "type": "default"
      },
      {
        "id": "e2",
        "source": "approval-1",
        "target": "end-1",
        "type": "default"
      }
    ],
    "createdBy": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "companyId": "507f1f77bcf86cd799439011",
    "name": "High-Value Approval Workflow",
    "description": "Approval workflow for high-value expense requests",
    "version": 1,
    "isActive": false,
    "nodes": [...],
    "edges": [...],
    "createdBy": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
]
```

### Empty Response (200 OK)

When the company has no workflows:

```json
[]
```

## Error Responses

### 400 Bad Request - Invalid Company ID Format

```json
{
  "error": "Invalid company ID format"
}
```

**Cause**: The provided `companyId` is not a valid MongoDB ObjectId (must be 24 hexadecimal characters).

### 401 Unauthorized - Authentication Required

```json
{
  "error": "Unauthorized: Authentication required"
}
```

**Cause**: No valid authentication credentials provided.

### 403 Forbidden - User Not Associated with Company

```json
{
  "error": "Forbidden: User must be associated with a company"
}
```

**Cause**: The authenticated user is not associated with any company.

### 403 Forbidden - Access Denied to Company

```json
{
  "error": "Forbidden: Access denied to this company's workflows"
}
```

**Cause**: The authenticated user's company does not match the requested `companyId`. This enforces multi-tenant isolation.

### 500 Internal Server Error

```json
{
  "error": "Failed to retrieve workflows",
  "details": "Error message details"
}
```

**Cause**: An unexpected server error occurred.

## Behavior

### Multi-Tenant Isolation

The endpoint enforces strict multi-tenant isolation:

1. **Authentication Check**: Verifies the user is authenticated
2. **Company Association**: Verifies the user belongs to a company
3. **Company Match**: Verifies the user's company matches the requested `companyId`
4. **Data Filtering**: Returns only workflows belonging to the requested company

This ensures that:
- Users can only access workflows from their own company
- No cross-company data leakage occurs
- Company data remains completely isolated

### Workflow Ordering

Workflows are returned sorted by creation date in descending order (most recent first).

### Workflow Versions

The endpoint returns all workflow versions for the company, including:
- Active workflows (`isActive: true`)
- Inactive workflows (`isActive: false`)
- All version numbers

This allows clients to:
- Display workflow history
- Compare different versions
- Identify the active workflow

### Population

The `createdBy` field is populated with user details (name and email) for convenience.

## Usage Examples

### Example 1: List All Workflows for Company

```bash
curl -X GET \
  'https://api.example.com/api/workflows/company/507f1f77bcf86cd799439011' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Example 2: Filter Active Workflows (Client-Side)

```typescript
// Fetch all workflows
const response = await fetch('/api/workflows/company/507f1f77bcf86cd799439011');
const workflows = await response.json();

// Filter for active workflows only
const activeWorkflows = workflows.filter(w => w.isActive);
```

### Example 3: Group by Workflow Name (Client-Side)

```typescript
// Fetch all workflows
const response = await fetch('/api/workflows/company/507f1f77bcf86cd799439011');
const workflows = await response.json();

// Group by workflow name to see versions
const workflowsByName = workflows.reduce((acc, workflow) => {
  if (!acc[workflow.name]) {
    acc[workflow.name] = [];
  }
  acc[workflow.name].push(workflow);
  return acc;
}, {});
```

## Security Considerations

1. **Multi-Tenant Isolation**: The endpoint strictly enforces company-level isolation to prevent unauthorized access to other companies' workflows.

2. **Authentication Required**: All requests must be authenticated.

3. **Authorization Check**: The user's company is verified against the requested company ID.

4. **ObjectId Validation**: Company IDs are validated to prevent injection attacks.

5. **Error Messages**: Error messages do not reveal sensitive information about other companies or workflows.

## Performance Considerations

1. **Database Query**: Uses a single query with company ID filter and index
2. **Population**: Populates `createdBy` field in a single query
3. **Sorting**: Sorts by `createdAt` in descending order using database index
4. **Scalability**: Efficient for companies with hundreds of workflows

## Related Endpoints

- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/:id` - Get a specific workflow by ID
- `PUT /api/workflows/:id` - Update a workflow (creates new version)
- `DELETE /api/workflows/:id` - Delete a workflow
- `GET /api/workflows/:id/versions` - Get version history for a workflow
- `POST /api/workflows/:id/activate` - Activate a workflow version

## Notes

- The endpoint returns all workflows for the company, including all versions
- Clients should filter or group workflows as needed for their use case
- The `isActive` flag indicates which workflow version is currently active
- Multiple workflows can exist with the same name but different versions
- Workflows are sorted by creation date (most recent first) by default
