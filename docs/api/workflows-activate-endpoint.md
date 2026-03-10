# POST /api/workflows/:id/activate

Activates a workflow version and deactivates any previously active version for the same company. Only one workflow version can be active at a time per company.

## Requirements

- **9.3**: New executions use the latest active workflow version
- **5.6**: Prevent activation of workflows that fail validation

## Endpoint

```
POST /api/workflows/:id/activate
```

## Path Parameters

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | Workflow ID to activate        |

## Authentication

- **Required**: Yes
- **Authorization**: User must belong to the same company as the workflow

## Request Body

No request body required.

## Response

### Success Response (200 OK)

```json
{
  "message": "Workflow activated successfully",
  "workflow": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Standard Approval Flow",
    "version": 2,
    "isActive": true,
    "companyId": "507f1f77bcf86cd799439012"
  }
}
```

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

#### 403 Forbidden - Cross-Company Access

```json
{
  "error": "Forbidden: Cannot activate workflow from another company"
}
```

#### 404 Not Found

```json
{
  "error": "Workflow not found"
}
```

#### 400 Bad Request - Invalid Workflow Structure

```json
{
  "error": "Cannot activate invalid workflow",
  "validationErrors": [
    "Workflow must have exactly one start node",
    "Workflow must have at least one end node"
  ]
}
```

#### 400 Bad Request - Invalid Role References

```json
{
  "error": "Cannot activate workflow with invalid role references",
  "validationErrors": [
    "Role 507f1f77bcf86cd799439013 not found in company"
  ]
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to activate workflow",
  "details": "Error message"
}
```

## Behavior

### Activation Process

1. **Authentication Check**: Verifies user is authenticated
2. **Company Verification**: Ensures user belongs to a company
3. **Workflow Lookup**: Finds the workflow by ID
4. **Authorization Check**: Verifies workflow belongs to user's company
5. **Structure Validation**: Validates workflow structure (start node, end nodes, reachability, etc.)
6. **Role Validation**: Validates all role references exist in the company
7. **Deactivation**: Deactivates all other workflows for the company
8. **Activation**: Sets the specified workflow as active

### Multi-Tenant Isolation

- Only workflows belonging to the user's company can be activated
- Deactivation only affects workflows within the same company
- Cross-company workflow access is prevented

### Validation Requirements

Before activation, the workflow must pass:

- **Structure Validation**:
  - Exactly one start node
  - At least one end node
  - All nodes reachable from start
  - Parallel splits have matching joins
  - Conditional nodes have exactly two outputs (true/false)

- **Role Validation**:
  - All referenced roles exist in the company
  - Role IDs are valid ObjectIds

### Active Workflow Guarantee

- Only one workflow can be active per company at any time
- When a workflow is activated, all other workflows for that company are automatically deactivated
- New workflow executions will use the newly activated version
- In-progress executions continue using their original workflow version

## Example Usage

### cURL

```bash
curl -X POST https://api.example.com/api/workflows/507f1f77bcf86cd799439011/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript (fetch)

```javascript
const response = await fetch('/api/workflows/507f1f77bcf86cd799439011/activate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});

const data = await response.json();

if (response.ok) {
  console.log('Workflow activated:', data.workflow);
} else {
  console.error('Activation failed:', data.error);
}
```

### TypeScript

```typescript
interface ActivateWorkflowResponse {
  message: string;
  workflow: {
    _id: string;
    name: string;
    version: number;
    isActive: boolean;
    companyId: string;
  };
}

async function activateWorkflow(workflowId: string): Promise<ActivateWorkflowResponse> {
  const response = await fetch(`/api/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to activate workflow');
  }

  return response.json();
}
```

## Use Cases

### Activating a New Workflow Version

When a system admin creates a new version of a workflow and wants to make it active:

```javascript
// After creating/updating a workflow
const workflowId = '507f1f77bcf86cd799439011';
const result = await activateWorkflow(workflowId);
console.log(`Activated ${result.workflow.name} v${result.workflow.version}`);
```

### Switching Between Workflow Versions

When a system admin wants to revert to a previous workflow version:

```javascript
// Get all versions
const versions = await fetch('/api/workflows/507f1f77bcf86cd799439011/versions').then(r => r.json());

// Find the version to activate
const previousVersion = versions.find(v => v.version === 1);

// Activate it
await activateWorkflow(previousVersion._id);
```

## Related Endpoints

- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow (creates new version)
- `GET /api/workflows/:id/versions` - Get workflow version history
- `POST /api/workflows/:id/validate` - Validate workflow before activation
- `POST /api/executions` - Create new execution (uses active workflow)

## Notes

- Activation is idempotent - activating an already-active workflow succeeds without changes
- Validation is performed automatically before activation
- In-progress workflow executions are not affected by activation
- Only new executions will use the newly activated workflow version
- System admins should validate workflows before activation to avoid errors
