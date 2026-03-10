# POST /api/workflows Endpoint

## Overview

Creates a new workflow configuration for a company. The endpoint validates the workflow structure and associates it with the authenticated user's company.

## Requirements Implemented

- **Requirement 4.1**: Persists complete workflow configuration
- **Requirement 8.3**: Enforces company-level isolation

## Authentication

- **Required**: Yes
- **Authorization**: User must be authenticated and associated with a company

## Request

### Method
`POST /api/workflows`

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
  version?: number;                // Optional: Version number (defaults to 1)
  isActive?: boolean;              // Optional: Active status (defaults to false)
  nodes: WorkflowNode[];           // Required: Array of workflow nodes
  edges: WorkflowEdge[];           // Required: Array of workflow edges
}
```

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
{
  "name": "Standard Approval Workflow",
  "description": "Basic approval workflow with manager and director approval",
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
      "id": "end-1",
      "type": "end",
      "label": "End",
      "position": { "x": 300, "y": 100 },
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
      "target": "end-1",
      "type": "default"
    }
  ]
}
```

## Response

### Success Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "companyId": "507f1f77bcf86cd799439010",
  "name": "Standard Approval Workflow",
  "description": "Basic approval workflow with manager and director approval",
  "version": 1,
  "isActive": false,
  "nodes": [...],
  "edges": [...],
  "createdBy": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized: Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden: User must be associated with a company"
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
    "Node 'Manager Approval' (approval-1) references role ID '507f1f77bcf86cd799439011' which does not exist in the company"
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to create workflow",
  "details": "Database connection failed"
}
```

## Validation Rules

The endpoint performs comprehensive validation before creating a workflow:

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

## Multi-Tenant Isolation

The endpoint enforces strict multi-tenant isolation:

1. The workflow is automatically associated with the authenticated user's company
2. Role validation ensures only roles from the same company can be referenced
3. Users cannot create workflows for other companies

## Usage Example

```javascript
// Using fetch API
const response = await fetch('/api/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies for authentication
  body: JSON.stringify({
    name: 'My Workflow',
    nodes: [...],
    edges: [...],
  }),
});

if (response.ok) {
  const workflow = await response.json();
  console.log('Workflow created:', workflow._id);
} else {
  const error = await response.json();
  console.error('Error:', error.error);
  if (error.validationErrors) {
    console.error('Validation errors:', error.validationErrors);
  }
}
```

## Related Endpoints

- `GET /api/workflows/:id` - Retrieve a specific workflow
- `PUT /api/workflows/:id` - Update a workflow (creates new version)
- `DELETE /api/workflows/:id` - Delete a workflow
- `GET /api/workflows/company/:companyId` - List all workflows for a company

## Notes

- Workflows are created with `isActive: false` by default
- To activate a workflow, use the `POST /api/workflows/:id/activate` endpoint
- The `version` field defaults to 1 for new workflows
- The `createdBy` field is automatically set to the authenticated user
- The `companyId` field is automatically set from the user's company association
