# GET /api/workflows/:id Endpoint

## Overview

Retrieves a specific workflow configuration by its ID. This endpoint enforces multi-tenant isolation by verifying that the authenticated user's company matches the workflow's company.

## Requirements

- **4.3**: Retrieve workflow configuration for company
- **8.3**: Enforce company-level isolation

## Authentication

- **Required**: Yes
- **Method**: JWT token via `auth-token` cookie

## Authorization

- User must be authenticated
- User must belong to a company
- User's company must match the workflow's company (multi-tenant isolation)

## Request

### Path Parameters

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | MongoDB ObjectId of workflow   |

### Example Request

```http
GET /api/workflows/507f1f77bcf86cd799439011 HTTP/1.1
Host: api.example.com
Cookie: auth-token=<jwt-token>
```

## Response

### Success Response (200 OK)

Returns the complete workflow configuration including all nodes, edges, and metadata.

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "companyId": "507f1f77bcf86cd799439012",
  "name": "Standard Approval Workflow",
  "description": "Default workflow for expense approvals",
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
        "roleId": "507f1f77bcf86cd799439013"
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
    "_id": "507f1f77bcf86cd799439014",
    "name": "John Doe",
    "email": "john.doe@example.com"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid ID Format

```json
{
  "error": "Invalid workflow ID format"
}
```

#### 401 Unauthorized - Not Authenticated

```json
{
  "error": "Unauthorized: Authentication required"
}
```

#### 403 Forbidden - No Company Association

```json
{
  "error": "Forbidden: User must be associated with a company"
}
```

#### 403 Forbidden - Company Mismatch

```json
{
  "error": "Forbidden: Access denied to this workflow"
}
```

This error occurs when the authenticated user attempts to access a workflow belonging to a different company, enforcing multi-tenant isolation.

#### 404 Not Found - Workflow Not Found

```json
{
  "error": "Workflow not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to retrieve workflow",
  "details": "Error message"
}
```

## Multi-Tenant Isolation

This endpoint implements strict multi-tenant isolation:

1. **Authentication Check**: Verifies user is authenticated via JWT token
2. **Company Association**: Retrieves user's company from database
3. **Workflow Retrieval**: Fetches workflow by ID
4. **Ownership Verification**: Compares workflow's `companyId` with user's company
5. **Access Control**: Denies access if companies don't match

This ensures that users can only access workflows belonging to their own company, preventing cross-company data leakage.

## Usage Examples

### Retrieve Active Workflow

```typescript
const response = await fetch('/api/workflows/507f1f77bcf86cd799439011', {
  method: 'GET',
  credentials: 'include', // Include cookies
});

if (response.ok) {
  const workflow = await response.json();
  console.log('Workflow:', workflow.name);
  console.log('Nodes:', workflow.nodes.length);
  console.log('Active:', workflow.isActive);
} else {
  const error = await response.json();
  console.error('Error:', error.error);
}
```

### Load Workflow in Builder

```typescript
async function loadWorkflowForEditing(workflowId: string) {
  try {
    const response = await fetch(`/api/workflows/${workflowId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load workflow');
    }
    
    const workflow = await response.json();
    
    // Initialize workflow builder with loaded data
    workflowBuilder.setNodes(workflow.nodes);
    workflowBuilder.setEdges(workflow.edges);
    workflowBuilder.setMetadata({
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
    });
    
    return workflow;
  } catch (error) {
    console.error('Error loading workflow:', error);
    throw error;
  }
}
```

## Related Endpoints

- `POST /api/workflows` - Create new workflow
- `PUT /api/workflows/:id` - Update workflow (creates new version)
- `DELETE /api/workflows/:id` - Delete workflow
- `GET /api/workflows/company/:companyId` - List all workflows for company
- `POST /api/workflows/:id/validate` - Validate workflow configuration
- `POST /api/workflows/:id/activate` - Activate workflow version

## Testing

See `__tests__/api/workflows/get-by-id.test.ts` for comprehensive unit tests covering:

- Workflow retrieval with valid ID
- Complete data structure preservation
- Multi-tenant isolation enforcement
- Error handling for invalid IDs
- Company ownership verification
- Complex workflow structures (conditional, parallel nodes)
