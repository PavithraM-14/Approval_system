# DELETE /api/workflows/:id Endpoint

## Overview

Deletes a workflow configuration if there are no active executions using it. This endpoint prevents breaking in-progress approval processes by checking for active workflow executions before allowing deletion. It enforces multi-tenant isolation by verifying that the authenticated user's company matches the workflow's company.

## Requirements

- **4.1**: Delete workflow if no active executions
- **8.3**: Enforce company-level isolation

## Authentication

- **Required**: Yes
- **Method**: JWT token via `auth-token` cookie

## Authorization

- User must be authenticated
- User must belong to a company
- User's company must match the workflow's company (multi-tenant isolation)
- Workflow must have no active executions (status: 'in_progress')

## Request

### Path Parameters

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | MongoDB ObjectId of workflow   |

### Example Request

```http
DELETE /api/workflows/507f1f77bcf86cd799439011 HTTP/1.1
Host: api.example.com
Cookie: auth-token=<jwt-token>
```

## Response

### Success Response (200 OK)

Returns a success message confirming the workflow was deleted.

```json
{
  "message": "Workflow deleted successfully",
  "workflowId": "507f1f77bcf86cd799439011"
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

This error occurs when the authenticated user attempts to delete a workflow belonging to a different company, enforcing multi-tenant isolation.

#### 404 Not Found - Workflow Not Found

```json
{
  "error": "Workflow not found"
}
```

#### 409 Conflict - Active Executions Exist

```json
{
  "error": "Cannot delete workflow with active executions",
  "details": "This workflow has 3 active execution(s). Please wait for them to complete before deleting."
}
```

This error occurs when the workflow has one or more active executions (status: 'in_progress'). The workflow can only be deleted after all active executions complete or are rejected.

#### 500 Internal Server Error

```json
{
  "error": "Failed to delete workflow",
  "details": "Error message"
}
```

## Deletion Logic

The endpoint follows this sequence to ensure safe deletion:

1. **Authentication Check**: Verifies user is authenticated via JWT token
2. **Company Association**: Retrieves user's company from database
3. **ID Validation**: Validates workflow ID format (24-character hex string)
4. **Workflow Retrieval**: Fetches workflow by ID
5. **Existence Check**: Returns 404 if workflow doesn't exist
6. **Ownership Verification**: Compares workflow's `companyId` with user's company
7. **Active Execution Check**: Counts executions with status 'in_progress' for this workflow
8. **Deletion Prevention**: Returns 409 conflict if active executions exist
9. **Deletion**: Removes workflow from database if all checks pass

## Active Execution Check

The endpoint queries the `ExecutionState` collection to count active executions:

```typescript
const activeExecutions = await ExecutionState.countDocuments({
  workflowId: workflowId,
  status: 'in_progress',
});
```

Only executions with status `'in_progress'` are considered active. Executions with status `'completed'` or `'rejected'` do not prevent deletion.

## Multi-Tenant Isolation

This endpoint implements strict multi-tenant isolation:

1. **Authentication Check**: Verifies user is authenticated via JWT token
2. **Company Association**: Retrieves user's company from database
3. **Workflow Retrieval**: Fetches workflow by ID
4. **Ownership Verification**: Compares workflow's `companyId` with user's company
5. **Access Control**: Denies deletion if companies don't match

This ensures that users can only delete workflows belonging to their own company, preventing cross-company data manipulation.

## Usage Examples

### Delete Workflow

```typescript
const response = await fetch('/api/workflows/507f1f77bcf86cd799439011', {
  method: 'DELETE',
  credentials: 'include', // Include cookies
});

if (response.ok) {
  const result = await response.json();
  console.log('Success:', result.message);
  console.log('Deleted workflow ID:', result.workflowId);
} else {
  const error = await response.json();
  console.error('Error:', error.error);
  if (error.details) {
    console.error('Details:', error.details);
  }
}
```

### Delete with Error Handling

```typescript
async function deleteWorkflow(workflowId: string) {
  try {
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 409) {
        // Active executions exist
        throw new Error(
          `Cannot delete workflow: ${error.details}`
        );
      } else if (response.status === 403) {
        // Access denied
        throw new Error('You do not have permission to delete this workflow');
      } else if (response.status === 404) {
        // Not found
        throw new Error('Workflow not found');
      } else {
        throw new Error(error.error || 'Failed to delete workflow');
      }
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
}
```

### Delete with Confirmation

```typescript
async function deleteWorkflowWithConfirmation(workflowId: string) {
  // Check for active executions first
  const executionsResponse = await fetch(
    `/api/executions?workflowId=${workflowId}&status=in_progress`
  );
  
  if (executionsResponse.ok) {
    const executions = await executionsResponse.json();
    
    if (executions.length > 0) {
      const confirmed = confirm(
        `This workflow has ${executions.length} active execution(s). ` +
        `Deletion is not allowed until they complete. ` +
        `Would you like to view the active executions?`
      );
      
      if (confirmed) {
        // Navigate to executions view
        window.location.href = `/executions?workflowId=${workflowId}`;
      }
      return;
    }
  }
  
  // No active executions, proceed with deletion
  const confirmed = confirm(
    'Are you sure you want to delete this workflow? This action cannot be undone.'
  );
  
  if (confirmed) {
    await deleteWorkflow(workflowId);
  }
}
```

## Deletion Scenarios

### Allowed Deletions

The following scenarios allow workflow deletion:

1. **No Executions**: Workflow has never been executed
2. **Completed Executions Only**: All executions have status 'completed'
3. **Rejected Executions Only**: All executions have status 'rejected'
4. **Mixed Non-Active**: Executions are 'completed' or 'rejected', but none are 'in_progress'
5. **Inactive Workflow**: Workflow is not active (isActive: false) and has no active executions
6. **Old Version**: Previous workflow version with no active executions

### Prevented Deletions

The following scenarios prevent workflow deletion:

1. **Single Active Execution**: At least one execution with status 'in_progress'
2. **Multiple Active Executions**: Multiple executions with status 'in_progress'
3. **Active Workflow in Use**: Active workflow (isActive: true) with in-progress executions
4. **Recent Execution**: Workflow with recently started executions still in progress

## Workflow Versioning Considerations

When working with workflow versions:

- Each workflow version is a separate document with its own `_id`
- Deleting one version does not affect other versions
- Active executions are tied to specific workflow versions via `workflowId`
- You can delete old versions if they have no active executions
- The active version (isActive: true) can be deleted if no executions are in progress

## Best Practices

1. **Check Before Delete**: Query for active executions before attempting deletion
2. **User Feedback**: Provide clear error messages when deletion is prevented
3. **Confirmation Dialog**: Always confirm with user before deleting workflows
4. **Alternative Actions**: Offer to deactivate instead of delete if executions exist
5. **Audit Trail**: Log workflow deletions for compliance and audit purposes
6. **Soft Delete**: Consider implementing soft delete (marking as deleted) instead of hard delete

## Related Endpoints

- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/:id` - Retrieve workflow configuration
- `PUT /api/workflows/:id` - Update workflow (creates new version)
- `GET /api/workflows/company/:companyId` - List all workflows for company
- `GET /api/executions?workflowId=:id&status=in_progress` - Check for active executions
- `POST /api/workflows/:id/activate` - Activate/deactivate workflow version

## Testing

See `__tests__/api/workflows/delete.test.ts` for comprehensive unit tests covering:

- Successful deletion when no active executions exist
- Deletion prevention when active executions exist
- Multi-tenant isolation enforcement
- Error handling for invalid IDs
- Company ownership verification
- Execution status filtering (in_progress vs completed/rejected)
- Complex deletion scenarios with multiple versions
- Response format validation

## Security Considerations

1. **Multi-Tenant Isolation**: Strict company-level access control prevents cross-company deletions
2. **Authentication Required**: All requests must include valid JWT token
3. **Authorization Check**: User's company must match workflow's company
4. **Data Integrity**: Active execution check prevents breaking in-progress processes
5. **Audit Logging**: Consider logging all deletion attempts for security audits
6. **Rate Limiting**: Consider implementing rate limits to prevent abuse
