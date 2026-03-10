# GET /api/workflows/:id/versions Endpoint

## Overview

Retrieves the complete version history for a workflow. This endpoint returns all versions of workflows with the same name and company, allowing system administrators to view previous workflow configurations for audit purposes and version comparison.

## Requirements

- **9.4**: Maintain a history of workflow versions for audit purposes
- **9.5**: Allow System_Admins to view previous workflow versions

## Authentication

- **Required**: Yes
- **Method**: JWT token via `auth-token` cookie

## Authorization

- User must be authenticated
- User must belong to a company
- User's company must match the workflow's company (multi-tenant isolation)

## Request

### Path Parameters

| Parameter | Type   | Required | Description                                           |
|-----------|--------|----------|-------------------------------------------------------|
| id        | string | Yes      | MongoDB ObjectId of any version of the workflow       |

**Note**: You can use the ID of any version of the workflow. The endpoint will return all versions that share the same name and company.

### Example Request

```http
GET /api/workflows/507f1f77bcf86cd799439011/versions HTTP/1.1
Host: api.example.com
Cookie: auth-token=<jwt-token>
```

## Response

### Success Response (200 OK)

Returns an array of workflow configurations, sorted by version number in descending order (newest first).

```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "companyId": "507f1f77bcf86cd799439012",
    "name": "Standard Approval Workflow",
    "description": "Updated workflow with additional approval step",
    "version": 3,
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
        "id": "approval-2",
        "type": "approval",
        "label": "Director Approval",
        "position": { "x": 200, "y": 100 },
        "data": {
          "roleId": "507f1f77bcf86cd799439016"
        }
      },
      {
        "id": "end-1",
        "type": "end",
        "label": "End",
        "position": { "x": 300, "y": 200 },
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
    ],
    "createdBy": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "createdAt": "2024-01-03T00:00:00.000Z",
    "updatedAt": "2024-01-03T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "companyId": "507f1f77bcf86cd799439012",
    "name": "Standard Approval Workflow",
    "description": "Updated workflow with conditional routing",
    "version": 2,
    "isActive": false,
    "nodes": [
      {
        "id": "start-1",
        "type": "start",
        "label": "Start",
        "position": { "x": 0, "y": 0 },
        "data": {}
      },
      {
        "id": "conditional-1",
        "type": "conditional",
        "label": "Check Amount",
        "position": { "x": 100, "y": 100 },
        "data": {
          "condition": {
            "field": "amount",
            "operator": "gt",
            "value": 1000
          }
        }
      },
      {
        "id": "approval-1",
        "type": "approval",
        "label": "Manager Approval",
        "position": { "x": 200, "y": 50 },
        "data": {
          "roleId": "507f1f77bcf86cd799439013"
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
        "target": "conditional-1",
        "type": "default"
      },
      {
        "id": "e2",
        "source": "conditional-1",
        "target": "approval-1",
        "type": "conditional",
        "label": "true"
      },
      {
        "id": "e3",
        "source": "conditional-1",
        "target": "end-1",
        "type": "conditional",
        "label": "false"
      },
      {
        "id": "e4",
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
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439011",
    "companyId": "507f1f77bcf86cd799439012",
    "name": "Standard Approval Workflow",
    "description": "Initial workflow version",
    "version": 1,
    "isActive": false,
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
]
```

### Response Fields

Each workflow version in the array contains:

| Field       | Type     | Description                                           |
|-------------|----------|-------------------------------------------------------|
| _id         | string   | Unique identifier for this version                    |
| companyId   | string   | Company that owns this workflow                       |
| name        | string   | Workflow name (same across all versions)              |
| description | string   | Version-specific description                          |
| version     | number   | Version number (increments with each update)          |
| isActive    | boolean  | Whether this is the currently active version          |
| nodes       | array    | Workflow nodes configuration                          |
| edges       | array    | Workflow edges/connections                            |
| createdBy   | object   | User who created this version                         |
| createdAt   | string   | ISO 8601 timestamp of version creation                |
| updatedAt   | string   | ISO 8601 timestamp of last update                     |

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

This error occurs when the authenticated user attempts to access workflow versions belonging to a different company, enforcing multi-tenant isolation.

#### 404 Not Found - Workflow Not Found

```json
{
  "error": "Workflow not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to retrieve workflow versions",
  "details": "Error message"
}
```

## Multi-Tenant Isolation

This endpoint implements strict multi-tenant isolation:

1. **Authentication Check**: Verifies user is authenticated via JWT token
2. **Company Association**: Retrieves user's company from database
3. **Base Workflow Retrieval**: Fetches the specified workflow by ID
4. **Ownership Verification**: Compares workflow's `companyId` with user's company
5. **Version Filtering**: Returns only versions belonging to the user's company
6. **Access Control**: Denies access if companies don't match

This ensures that users can only access workflow versions belonging to their own company, preventing cross-company data leakage.

## Version Ordering

Versions are returned in **descending order** by version number (newest first). This ordering:

- Makes it easy to identify the latest version (first in array)
- Provides a chronological view of workflow evolution
- Simplifies UI display of version history

## Use Cases

### Audit Trail

System administrators can review the complete history of workflow changes for compliance and audit purposes:

- Track when workflows were modified
- Identify who made each change
- Compare different versions to understand evolution

### Version Comparison

Users can compare different versions to understand what changed:

- View structural differences (nodes, edges)
- Compare approval requirements
- Analyze routing logic changes

### Rollback Reference

While the system doesn't support automatic rollback, administrators can:

- View previous versions as reference
- Manually recreate older workflow configurations
- Understand the impact of recent changes

### In-Progress Request Analysis

When troubleshooting in-progress approval requests:

- Identify which version is being used
- Understand the workflow logic at the time of submission
- Verify correct routing behavior

## Usage Examples

### Retrieve Version History

```typescript
async function getWorkflowVersions(workflowId: string) {
  try {
    const response = await fetch(`/api/workflows/${workflowId}/versions`, {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve workflow versions');
    }

    const versions = await response.json();
    
    console.log(`Found ${versions.length} versions`);
    console.log('Latest version:', versions[0].version);
    console.log('Active version:', versions.find(v => v.isActive)?.version);
    
    return versions;
  } catch (error) {
    console.error('Error retrieving versions:', error);
    throw error;
  }
}
```

### Display Version History in UI

```typescript
async function displayVersionHistory(workflowId: string) {
  const versions = await fetch(`/api/workflows/${workflowId}/versions`)
    .then(res => res.json());

  const versionList = versions.map(version => ({
    id: version._id,
    version: version.version,
    description: version.description,
    isActive: version.isActive,
    createdBy: version.createdBy.name,
    createdAt: new Date(version.createdAt).toLocaleDateString(),
    nodeCount: version.nodes.length,
    edgeCount: version.edges.length,
  }));

  return versionList;
}
```

### Compare Two Versions

```typescript
async function compareVersions(workflowId: string, version1: number, version2: number) {
  const versions = await fetch(`/api/workflows/${workflowId}/versions`)
    .then(res => res.json());

  const v1 = versions.find(v => v.version === version1);
  const v2 = versions.find(v => v.version === version2);

  if (!v1 || !v2) {
    throw new Error('Version not found');
  }

  return {
    nodesDiff: {
      added: v2.nodes.length - v1.nodes.length,
      v1Count: v1.nodes.length,
      v2Count: v2.nodes.length,
    },
    edgesDiff: {
      added: v2.edges.length - v1.edges.length,
      v1Count: v1.edges.length,
      v2Count: v2.edges.length,
    },
    descriptionChanged: v1.description !== v2.description,
  };
}
```

### Find Active Version

```typescript
async function getActiveVersion(workflowId: string) {
  const versions = await fetch(`/api/workflows/${workflowId}/versions`)
    .then(res => res.json());

  const activeVersion = versions.find(v => v.isActive);

  if (!activeVersion) {
    throw new Error('No active version found');
  }

  return activeVersion;
}
```

### Check Version Continuity

```typescript
async function validateVersionContinuity(workflowId: string) {
  const versions = await fetch(`/api/workflows/${workflowId}/versions`)
    .then(res => res.json());

  // Sort by version ascending
  const sorted = versions.sort((a, b) => a.version - b.version);

  // Check for gaps
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].version !== i + 1) {
      console.warn(`Version gap detected: expected ${i + 1}, found ${sorted[i].version}`);
      return false;
    }
  }

  return true;
}
```

## Related Endpoints

- `GET /api/workflows/:id` - Retrieve specific workflow version
- `POST /api/workflows` - Create new workflow (version 1)
- `PUT /api/workflows/:id` - Update workflow (creates new version)
- `DELETE /api/workflows/:id` - Delete workflow
- `GET /api/workflows/company/:companyId` - List all workflows for company
- `POST /api/workflows/:id/activate` - Activate specific workflow version

## Workflow Versioning Behavior

### Version Creation

- New versions are created when updating a workflow via `PUT /api/workflows/:id`
- Version numbers increment sequentially (1, 2, 3, ...)
- Each version is a complete, independent workflow configuration

### Version Isolation

- In-progress approval requests continue using their original version
- New requests use the currently active version
- Versions are immutable once created

### Active Version

- Only one version can be active at a time
- The active version is used for new approval requests
- Activating a version deactivates all other versions

## Testing

See `__tests__/api/workflows/versions.test.ts` for comprehensive unit tests covering:

- Version history retrieval with multiple versions
- Version ordering (descending by version number)
- Active version identification
- Multi-tenant isolation enforcement
- Error handling for invalid IDs
- Company ownership verification
- Version metadata and audit trail
- Version comparison support
- Version history completeness

