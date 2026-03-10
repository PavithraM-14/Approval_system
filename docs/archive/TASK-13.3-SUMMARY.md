# Task 13.3 Implementation Summary

## Task: Update request approval logic

**Requirements:**
- 6.3: Route approval actions through WorkflowExecutionEngine
- 6.8: Update request status based on workflow completion

## Implementation Overview

Updated the request approval endpoint (`app/api/requests/[id]/approve/route.ts`) to route approval and rejection actions through the WorkflowExecutionEngine when a request uses a custom workflow.

## Changes Made

### 1. Import WorkflowExecutionEngine
Added imports for the workflow execution engine and execution state model:
```typescript
import { workflowExecutionEngine } from '../../../../../lib/workflow-execution-engine';
import ExecutionState from '../../../../../models/ExecutionState';
```

### 2. Custom Workflow Routing Logic
Added logic immediately after request retrieval to check if the request uses a custom workflow:

```typescript
if (requestRecord.useCustomWorkflow && requestRecord.workflowExecutionId) {
  // Route through WorkflowExecutionEngine
  if (action === 'approve' || action === 'reject') {
    const workflowAction = action === 'approve' ? 'approved' : 'rejected';
    const updatedExecutionState = await workflowExecutionEngine.processAction(
      requestRecord.workflowExecutionId.toString(),
      workflowAction,
      user.id,
      notes
    );
    
    // Update request status based on workflow completion
    if (updatedExecutionState.status === 'completed') {
      newRequestStatus = RequestStatus.APPROVED;
    } else if (updatedExecutionState.status === 'rejected') {
      newRequestStatus = RequestStatus.REJECTED;
    }
  }
}
```

### 3. Request Status Updates (Requirement 6.8)
The implementation updates the request status based on the workflow execution state:
- **Workflow completed** → Request status = `APPROVED`
- **Workflow rejected** → Request status = `REJECTED`
- **Workflow in progress** → Request status remains unchanged

### 4. History Entry Creation
Added history entries to track approval/rejection actions:
- Records the action (APPROVE or REJECT)
- Captures the actor (user ID)
- Stores notes and signature (if applicable)
- Tracks status transitions

### 5. Legacy Workflow Fallback
The implementation maintains backward compatibility:
- Requests with `useCustomWorkflow = false` continue using the legacy approval logic
- Requests without a `workflowExecutionId` fall back to legacy workflow
- All existing functionality remains intact

### 6. Action Restrictions
For custom workflow requests, only `approve` and `reject` actions are supported through the workflow engine. Other actions (clarify, forward, etc.) return an error indicating they are not supported for custom workflows.

## Test Coverage

Created comprehensive unit tests in `__tests__/api/requests/approve-workflow-integration.test.ts`:

### Test Suites:
1. **Custom Workflow Approval Routing (Requirement 6.3)**
   - Routes approve action through WorkflowExecutionEngine ✓
   - Routes reject action through WorkflowExecutionEngine ✓
   - Does not route non-approve/reject actions ✓

2. **Request Status Update Based on Workflow Completion (Requirement 6.8)**
   - Marks request as APPROVED when workflow reaches end node ✓
   - Marks request as REJECTED when workflow is rejected ✓
   - Keeps request status unchanged when workflow is still in progress ✓

3. **Legacy Workflow Fallback**
   - Uses legacy workflow when useCustomWorkflow is false ✓
   - Uses legacy workflow when workflowExecutionId is null ✓

4. **History Entry Creation**
   - Adds history entry with workflow approval action ✓
   - Adds history entry with workflow rejection action ✓

5. **Error Handling**
   - Handles workflow engine errors gracefully ✓
   - Handles invalid execution ID ✓

**All 12 tests pass successfully.**

## Integration Points

### With WorkflowExecutionEngine
- Calls `processAction()` method to advance workflow
- Receives updated execution state with current status
- Maps workflow actions ('approved'/'rejected') to engine format

### With Request Model
- Checks `useCustomWorkflow` flag to determine routing
- Uses `workflowExecutionId` to identify the execution
- Updates request status based on workflow completion
- Maintains history entries for audit trail

### With Notification Service
- Sends notifications after workflow actions
- Handles renewal date setting for approved renewal requests
- Maintains existing notification patterns

## Workflow Execution Flow

```
1. User submits approval/rejection action
   ↓
2. Check if request uses custom workflow
   ↓
3. If YES:
   a. Route action through WorkflowExecutionEngine
   b. Get updated execution state
   c. Update request status based on execution state:
      - completed → APPROVED
      - rejected → REJECTED
      - in_progress → unchanged
   d. Add history entry
   e. Send notifications
   ↓
4. If NO:
   Use legacy approval logic (existing code)
```

## Requirements Validation

### Requirement 6.3: Route approval actions through WorkflowExecutionEngine ✓
- Approval and rejection actions are routed through `workflowExecutionEngine.processAction()`
- User authorization is handled by the workflow engine
- Workflow state is updated correctly

### Requirement 6.8: Update request status based on workflow completion ✓
- Request status is set to APPROVED when workflow reaches end node (status = 'completed')
- Request status is set to REJECTED when workflow is rejected (status = 'rejected')
- Request status remains unchanged while workflow is in progress

## Error Handling

The implementation includes comprehensive error handling:
- Catches workflow engine errors and returns appropriate error responses
- Validates that only approve/reject actions are supported for custom workflows
- Maintains error logging for debugging
- Gracefully handles notification and renewal date failures

## Backward Compatibility

The implementation maintains full backward compatibility:
- Legacy workflow requests continue to work unchanged
- All existing approval logic remains intact
- No breaking changes to the API contract
- Existing tests continue to pass

## Next Steps

This completes task 13.3. The request approval logic now:
1. ✓ Routes approval actions through WorkflowExecutionEngine (Requirement 6.3)
2. ✓ Updates request status based on workflow completion (Requirement 6.8)
3. ✓ Maintains backward compatibility with legacy workflow
4. ✓ Has comprehensive test coverage

The integration between the Request model and the custom workflow system is now complete.
