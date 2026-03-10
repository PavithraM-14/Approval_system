# PUT /api/workflows/:id Endpoint

## Overview

Updates a workflow configuration by creating a new version. This ensures that in-progress workflow executions continue using their original version while new executions use the updated version. The endpoint validates the workflow structure and enforces multi-tenant isolation.

## Requirements Implemented

- **Requirement 9.1**: Create new workflow version when updating (version increment)
- **Requirement 8.3**: Enforce company-level isolation

## Authentication

- **Required**: Yes
- **Authorization**: User must be authenticated, associated with a company, and the workflow must belong to their company

## Request

### Method
`PUT /api/workflows/:id`

### Path Parameters

- `id` (string, required): The MongoDB ObjectId of the workflow to update

### Headers
```
Content-Type: application/json
Cookie: auth-token=<jwt-token>
```

### Request Body

```typescript
{
  name: string;                    // Required: Workflow name
  description?: string;            // Optional: Workflow description
  isActive?: boolean;              // Optional: Active status (defaults to false)
  nodes: WorkflowNode[];           // Required: Array of workflow nodes
  edges: WorkflowEdge[];           // Required: Array of workflow edges
}
```

**Note**: The `version` field is automatically incremented by the endpoint and should not be included in the request body.

#### WorkflowNode Structure

```typescript
{
  id: string;                      // Unique node identifier
  type: 'start' | 'end' | 'approval' | 'parallel_split' | 'parallel_join' | 'conditional';
  label: string;                   // Display label
  position: { x: number; y: number };  // Canvas position
  data: {
    roleId?: string;               // For approval nodes: role ID
    condition?: {                  // For conditional nodes
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
      value: any;
    };
    description?: string;
  };
}
```

#### WorkflowEdge Structure

```typescript
{
  id: string;                      // Unique edge identifier
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  label?: string;                  // Edge label (required for conditional: 'true' or 'false')
  type?: 'default' | 'conditional';
}
```

### Example Request

```json
PUT /api/workflows/507f1f77bcf86cd799439014

{
  "name": "Standard Approval Workflow",
  "description": "Updated workflow with additional director approval",
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
        "roleId": "507f1f77bcf86cd799439011"
      }
    },
    {
      "id": "approval-2",
      "type": "approval",
      "label": "Director Approval",
      "position": { "x": 200, "y": 100 },
      "data": {
        "roleId": "507f1f77bcf86cd799439012"
      }
    },
    {
      "id": "approval-3",
      "type": "approval",
      "label": "VP Approval",
      "position": { "x": 300, "y": 100 },
      "data": {
        "roleId": "507f1f77bcf86cd799439015"
      }
    },
    {
      "id": "end-1",
      "type": "end",
      "label": "End",
      "position": { "x": 400, "y": 100 },
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
      "target": "approval-2",
      "type": "default"
    },
    {
      "id": "e3",
      "source": "approval-2",
      "target": "approval-3",
      "type": "default"
    },
    {
      "id": "e4",
      "source": "approval-3",
      "target": "end-1",
      "type": "default"
    }
  ]
}
```

## Response

### Success Response (200 OK)

```json
{
  "_id": "507f1f77bcf86cd799439020",
  "companyId": "507f1f77bcf86cd799439010",
  "name": "Standard Approval Workflow",
  "description": "Updated workflow with additional director approval",
  "version": 2,
  "isActive": false,
  "nodes": [...],
  "edges": [...],
  "createdBy": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-15T11:45:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

**Important Notes**:
- The response contains a **new workflow document** with a new `_id`
- The `version` field is automatically incremented (e.g., from 1 to 2)
- The original workflow (version 1) remains unchanged in the database
- In-progress executions continue using the original version

### Error Responses

#### 401 Unauthorized
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

#### 404 Not Found
```json
{
  "error": "Workflow not found"
}
```

#### 400 Bad Request - Invalid ID Format
```json
{
  "error": "Invalid workflow ID format"
}
```

#### 400 Bad Request - Validation Error
```json
{
  "error": "Validation error: name is required and must be a string"
}
```

#### 400 Bad Request - Workflow Validation Error
```json
{
  "error": "Workflow validation failed",
  "validationErrors": [
    "Workflow must have exactly one start node (found 0)",
    "Node 'Orphan Node' (orphan-1) is not reachable from the start node"
  ]
}
```

#### 400 Bad Request - Role Validation Error
```json
{
  "error": "Workflow role validation failed",
  "validationErrors": [
    "Node 'VP Approval' (approval-3) references role ID '507f1f77bcf86cd799439015' which does not exist in the company"
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to update workflow",
  "details": "Database connection failed"
}
```

## Validation Rules

The endpoint performs comprehensive validation before creating a new workflow version:

### Structure Validation
- Workflow must have exactly one start node
- Workflow must have at least one end node
- All nodes must be reachable from the start node

### Connection Validation
- Conditional nodes must have exactly 2 outgoing edges labeled 'true' and 'false'
- Parallel split nodes must have at least 2 outgoing paths
- Parallel join nodes must have at least 2 incoming edges
- Each parallel split must have a corresponding join node

### Role Validation
- All referenced role IDs must exist in the database
- All referenced roles must belong to the user's company (multi-tenant isolation)

### Data Validation
- `name` is required and must be a string
- `nodes` must be a non-empty array
- `edges` must be an array

## Workflow Versioning Behavior

### Version Increment Logic

1. The endpoint finds the highest version number for workflows with the same name and company
2. The new version number is set to `highest_version + 1`
3. A new workflow document is created with the incremented version
4. The original workflow document remains unchanged

### Example Version History

```
Initial workflow:
- _id: 507f1f77bcf86cd799439014
- name: "Standard Approval Workflow"
- version: 1
- isActive: true

After first update:
- _id: 507f1f77bcf86cd799439020  (new document)
- name: "Standard Approval Workflow"
- version: 2
- isActive: false

Original workflow still exists:
- _id: 507f1f77bcf86cd799439014  (unchanged)
- name: "Standard Approval Workflow"
- version: 1
- isActive: true  (still active for in-progress executions)
```

### In-Progress Executions

- Existing workflow executions continue using their original workflow version
- The `workflowVersion` field in `ExecutionState` references the version number
- This ensures that approval processes are not disrupted by workflow updates

### Activating New Version

- The new version is created with `isActive: false` by default
- To make the new version active for new executions, use `POST /api/workflows/:id/activate`
- Only one version can be active at a time per company

## Multi-Tenant Isolation

The endpoint enforces strict multi-tenant isolation:

1. Verifies the workflow belongs to the authenticated user's company
2. Returns 403 Forbidden if the workflow belongs to a different company
3. Role validation ensures only roles from the same company can be referenced
4. Users cannot update workflows from other companies

## Usage Example

```javascript
// Using fetch API
const workflowId = '507f1f77bcf86cd799439014';

const response = await fetch(`/api/workflows/${workflowId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies for authentication
  body: JSON.stringify({
    name: 'Updated Workflow',
    description: 'Added VP approval step',
    nodes: [...],
    edges: [...],
  }),
});

if (response.ok) {
  const newVersion = await response.json();
  console.log('New workflow version created:', newVersion.version);
  console.log('New workflow ID:', newVersion._id);
} else {
  const error = await response.json();
  console.error('Error:', error.error);
  if (error.validationErrors) {
    console.error('Validation errors:', error.validationErrors);
  }
}
```

## Related Endpoints

- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/:id` - Retrieve a specific workflow
- `DELETE /api/workflows/:id` - Delete a workflow
- `GET /api/workflows/:id/versions` - Get version history for a workflow
- `POST /api/workflows/:id/activate` - Activate a workflow version

## Best Practices

1. **Always validate before updating**: Use the validation endpoint or client-side validation before submitting updates
2. **Test new versions**: Create the new version with `isActive: false`, test it, then activate it
3. **Document changes**: Use the `description` field to document what changed in each version
4. **Monitor in-progress executions**: Check for in-progress executions before activating a new version
5. **Preserve workflow names**: Keep the same `name` for different versions of the same workflow

## Notes

- The endpoint creates a **new document** rather than modifying the existing one
- The original workflow ID remains valid and can still be queried
- Version numbers are scoped to workflow name and company
- The `createdBy` field is set to the user making the update
- The `createdAt` timestamp reflects when the new version was created
- To view all versions of a workflow, use `GET /api/workflows/:id/versions`

