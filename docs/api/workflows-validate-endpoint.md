# POST /api/workflows/:id/validate Endpoint

## Overview

Validates a workflow configuration without saving it to the database. Returns detailed validation results including structure validation, connection validation, and role validation. This endpoint is useful for providing real-time feedback to users while they design workflows in the workflow builder.

## Requirements Implemented

- **Requirement 5.1**: Validate exactly one start node
- **Requirement 5.2**: Validate at least one end node
- **Requirement 5.3**: Validate all nodes are reachable from start node
- **Requirement 5.4**: Validate parallel split-join matching
- **Requirement 5.5**: Display specific error messages for validation failures
- **Requirement 5.6**: Prevent activation of invalid workflows

## Authentication

- **Required**: Yes
- **Authorization**: User must be authenticated and associated with a company

## Request

### Method
`POST /api/workflows/:id/validate`

### Path Parameters

- `id`: Workflow ID (string) - Used for context, but validation is performed on the request body

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
  "description": "Basic approval workflow with manager approval",
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
      "id": "end-1",
      "type": "end",
      "label": "End",
      "position": { "x": 200, "y": 100 },
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
  ]
}
```

## Response

### Success Response - Valid Workflow (200 OK)

```json
{
  "valid": true,
  "errors": []
}
```

### Success Response - Invalid Workflow (200 OK)

The endpoint returns 200 OK even for invalid workflows, with `valid: false` and detailed error messages.

```json
{
  "valid": false,
  "errors": [
    "Workflow must have exactly one start node (found 0)",
    "Node 'Orphan Node' (orphan-1) is not reachable from the start node",
    "Conditional node 'Check Amount' (cond-1) must have exactly 2 outgoing edges (found 1)"
  ]
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

#### 400 Bad Request - Missing Required Fields
```json
{
  "valid": false,
  "errors": [
    "Validation error: name is required and must be a string"
  ]
}
```

```json
{
  "valid": false,
  "errors": [
    "Validation error: nodes array is required"
  ]
}
```

```json
{
  "valid": false,
  "errors": [
    "Validation error: edges array is required"
  ]
}
```

#### 400 Bad Request - Invalid JSON
```json
{
  "valid": false,
  "errors": [
    "Invalid JSON in request body"
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to validate workflow",
  "details": "Database connection failed"
}
```

## Validation Rules

The endpoint performs comprehensive validation:

### Structure Validation (Requirements 5.1, 5.2)
- **Exactly one start node**: Workflow must have one and only one start node
- **At least one end node**: Workflow must have one or more end nodes

### Connection Validation (Requirements 5.3, 5.4, 12.6)
- **Node reachability**: All nodes must be reachable from the start node (no orphaned nodes)
- **Conditional nodes**: Must have exactly 2 outgoing edges labeled 'true' and 'false'
- **Parallel split nodes**: Must have at least 2 outgoing paths and a corresponding join node
- **Parallel join nodes**: Must have at least 2 incoming edges

### Role Validation (Requirement 5.1-5.6)
- All referenced role IDs must exist in the database
- All referenced roles must belong to the user's company (multi-tenant isolation)

### Data Validation
- `name` is required and must be a string
- `nodes` must be an array
- `edges` must be an array

## Validation Error Messages

The endpoint provides specific, actionable error messages:

### Start Node Errors
- `"Workflow must have exactly one start node (found 0)"`
- `"Workflow must have exactly one start node (found 2)"`

### End Node Errors
- `"Workflow must have at least one end node (found 0)"`

### Reachability Errors
- `"Node 'Manager Approval' (approval-1) is not reachable from the start node"`

### Conditional Node Errors
- `"Conditional node 'Check Amount' (cond-1) must have exactly 2 outgoing edges (found 1)"`
- `"Conditional node 'Check Amount' (cond-1) must have edges labeled 'true' and 'false' (found: yes, no)"`

### Parallel Node Errors
- `"Parallel split node 'Split' (split-1) must have at least 2 outgoing paths (found 1)"`
- `"Parallel split node 'Split' (split-1) has no corresponding parallel join node"`
- `"Parallel join node 'Join' (join-1) must have at least 2 incoming edges (found 1)"`

### Role Validation Errors
- `"Node 'Manager Approval' (approval-1) references role ID '507f...' which does not exist in the company"`

## Multi-Tenant Isolation

The endpoint enforces strict multi-tenant isolation:

1. Role validation checks that all referenced roles belong to the authenticated user's company
2. Users cannot validate workflows with roles from other companies
3. The validation context is automatically scoped to the user's company

## Usage Example

### Using fetch API

```javascript
// Validate workflow before saving
const response = await fetch('/api/workflows/temp-id/validate', {
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

const result = await response.json();

if (result.valid) {
  console.log('Workflow is valid! Safe to save.');
  // Proceed to save the workflow
} else {
  console.error('Workflow validation failed:');
  result.errors.forEach(error => {
    console.error('- ' + error);
  });
  // Display errors to user
}
```

### Real-time Validation in Workflow Builder

```javascript
// Debounced validation function for real-time feedback
let validationTimeout;

function validateWorkflowRealtime(workflowData) {
  clearTimeout(validationTimeout);
  
  validationTimeout = setTimeout(async () => {
    const response = await fetch('/api/workflows/temp-id/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(workflowData),
    });
    
    const result = await response.json();
    
    if (result.valid) {
      showSuccessIndicator('Workflow is valid');
    } else {
      showValidationErrors(result.errors);
    }
  }, 500); // Wait 500ms after last change
}

// Call this function whenever the workflow changes
workflowBuilder.onChange(validateWorkflowRealtime);
```

### Validation Before Activation

```javascript
// Validate before activating a workflow
async function activateWorkflow(workflowId, workflowData) {
  // First, validate the workflow
  const validateResponse = await fetch(`/api/workflows/${workflowId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(workflowData),
  });
  
  const validationResult = await validateResponse.json();
  
  if (!validationResult.valid) {
    alert('Cannot activate invalid workflow:\n' + validationResult.errors.join('\n'));
    return;
  }
  
  // If valid, proceed with activation
  const activateResponse = await fetch(`/api/workflows/${workflowId}/activate`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (activateResponse.ok) {
    console.log('Workflow activated successfully');
  }
}
```

## Related Endpoints

- `POST /api/workflows` - Create a new workflow (includes validation)
- `PUT /api/workflows/:id` - Update a workflow (includes validation)
- `POST /api/workflows/:id/activate` - Activate a workflow (requires valid workflow)
- `GET /api/workflows/:id` - Retrieve a specific workflow

## Notes

- **No side effects**: This endpoint does not save or modify any data in the database
- **Real-time feedback**: Designed for use in the workflow builder to provide instant validation feedback
- **Comprehensive validation**: Performs all validation checks that would be done when saving or activating a workflow
- **Detailed errors**: Returns all validation errors, not just the first one encountered
- **Performance**: Validation is fast enough for real-time use (typically < 100ms)
- **Path parameter**: The `:id` parameter is included for consistency with other workflow endpoints but is not used in validation logic

## Best Practices

1. **Debounce validation calls**: When using for real-time validation, debounce the API calls to avoid excessive requests
2. **Display all errors**: Show all validation errors to the user, not just the first one
3. **Validate before save**: Always validate before attempting to save or activate a workflow
4. **Provide context**: Use the detailed error messages to highlight problematic nodes in the UI
5. **Handle network errors**: Implement proper error handling for network failures

