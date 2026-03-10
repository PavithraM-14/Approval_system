# Task 13.2 Implementation Summary

## Task Description
Update request submission logic to integrate with custom approval workflows.

## Requirements Addressed
- **Requirement 6.1**: Check if company has active custom workflow
- **Requirement 6.2**: Initialize workflow execution if custom workflow exists
- **Fallback**: Use legacy workflow if no custom workflow is configured

## Changes Made

### 1. Updated `app/api/requests/route.ts`

#### Added Imports
```typescript
import WorkflowConfiguration from '../../../models/WorkflowConfiguration';
import { workflowExecutionEngine } from '../../../lib/workflow-execution-engine';
```

#### Modified POST Endpoint Logic

**Before Request Creation:**
1. **Check for Active Custom Workflow** (Requirement 6.1)
   - Query `WorkflowConfiguration` for active workflow associated with user's company
   - Only check if user has a company assigned

2. **Initialize Workflow Execution** (Requirement 6.2)
   - If active workflow found, call `workflowExecutionEngine.initializeExecution()`
   - Set `useCustomWorkflow = true` and store `workflowExecutionId`
   - Set initial status to `SUBMITTED` with note "Request created and custom workflow initialized"
   - Log workflow initialization details

3. **Fallback to Legacy Workflow** (Requirement 6.1)
   - If no active workflow or initialization fails, use legacy logic
   - Maintain existing behavior: check for leave requests, set appropriate status
   - Set `useCustomWorkflow = false` and `workflowExecutionId = null`
   - Log legacy workflow usage

**Request Creation:**
- Include `useCustomWorkflow` and `workflowExecutionId` fields in request document
- Use appropriate initial status and notes based on workflow type

**Notifications:**
- Only send legacy notifications when `useCustomWorkflow = false`
- Custom workflows will handle their own notification logic

### 2. Created Unit Tests

**File:** `__tests__/api/requests/post-workflow-integration.test.ts`

**Test Coverage:**
- ✅ Custom workflow detection when company has active workflow
- ✅ Null return when no active workflow exists
- ✅ Handling users without company assignment
- ✅ Workflow execution initialization
- ✅ Setting useCustomWorkflow flag correctly
- ✅ Fallback to legacy workflow (no workflow, no company, initialization failure)
- ✅ Multi-tenant isolation (workflows scoped to correct company)
- ✅ Appropriate status and notes for both workflow types

**Test Results:** All 11 tests passing

## Implementation Details

### Custom Workflow Path
```
User submits request
  ↓
Check user.company exists
  ↓
Query WorkflowConfiguration.findOne({ companyId, isActive: true })
  ↓
If found → Initialize execution
  ↓
Create request with:
  - useCustomWorkflow: true
  - workflowExecutionId: <execution._id>
  - status: SUBMITTED
  - No legacy notifications
```

### Legacy Workflow Path
```
User submits request
  ↓
No company OR no active workflow OR initialization fails
  ↓
Use legacy logic:
  - Check for leave request
  - Set status (VP_APPROVAL or MANAGER_REVIEW)
  ↓
Create request with:
  - useCustomWorkflow: false
  - workflowExecutionId: null
  - status: <legacy status>
  - Send legacy notifications
```

## Error Handling

1. **Workflow Initialization Failure**
   - Caught in try-catch block
   - Logs error to console
   - Gracefully falls back to legacy workflow
   - Request creation continues without interruption

2. **User Without Company**
   - Skips workflow check entirely
   - Proceeds directly to legacy workflow logic

3. **No Active Workflow**
   - Returns null from query
   - Proceeds to legacy workflow logic

## Multi-Tenant Isolation

- Workflow queries always include `companyId` filter
- Only workflows belonging to user's company are considered
- Execution state is created with correct `companyId`
- Maintains complete data isolation between companies

## Backward Compatibility

- Existing requests without custom workflows continue to work
- Legacy workflow logic remains unchanged
- No breaking changes to existing API contracts
- Gradual migration path: companies can adopt custom workflows when ready

## Testing Results

```
✅ All 282 tests passing (18 test suites)
✅ New integration tests: 11/11 passing
✅ No regressions in existing tests
```

## Files Modified

1. `app/api/requests/route.ts` - Request submission logic
2. `__tests__/api/requests/post-workflow-integration.test.ts` - New test file

## Dependencies

- `models/WorkflowConfiguration` - Already implemented
- `models/ExecutionState` - Already implemented
- `lib/workflow-execution-engine` - Already implemented
- `models/Request` - Extended in task 13.1 (workflowExecutionId, useCustomWorkflow fields)

## Next Steps

Task 13.3 will update the request approval logic to route approval actions through the WorkflowExecutionEngine when `useCustomWorkflow = true`.
