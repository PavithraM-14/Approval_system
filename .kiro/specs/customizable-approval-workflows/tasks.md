
# Implementation Plan: Customizable Approval Workflows

## Overview

This implementation plan breaks down the customizable approval workflows feature into discrete coding tasks. The feature enables system administrators to create company-specific approval flows through a visual workflow builder, replacing the hardcoded approval flow with a dynamic, multi-tenant solution.

The implementation follows this sequence:
1. Database models and schemas
2. Backend services and business logic
3. API endpoints
4. Frontend components
5. Integration with existing Request model
6. Testing (property-based and unit tests)

## Tasks

- [ ] 1. Set up database models and schemas
  - [x] 1.1 Create CustomRole model with Mongoose schema
    - Define schema with companyId, name, description fields
    - Add compound index for (companyId, name) uniqueness
    - Add timestamps
    - _Requirements: 1.2, 1.5, 1.6, 8.1, 8.2_
  
  - [ ]* 1.2 Write property test for CustomRole model
    - **Property 1: Role Creation and Storage**
    - **Validates: Requirements 1.2**
  
  - [x] 1.3 Create UserRoleAssignment model with Mongoose schema
    - Define schema with userId, roleId, companyId, assignedAt fields
    - Add compound indexes for (userId, companyId), (roleId, companyId)
    - Add unique index for (userId, roleId)
    - _Requirements: 10.1, 10.2, 10.4_

  - [ ]* 1.4 Write property test for UserRoleAssignment model
    - **Property 27: Multiple Role Assignments Per User**
    - **Validates: Requirements 10.1, 10.4**
  
  - [x] 1.5 Create WorkflowConfiguration model with Mongoose schema
    - Define schema with companyId, name, version, isActive, nodes, edges fields
    - Add compound indexes for (companyId, version) and (companyId, isActive)
    - Define nested schemas for WorkflowNode and WorkflowEdge
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ]* 1.6 Write property test for WorkflowConfiguration model
    - **Property 5: Workflow Configuration Round-Trip**
    - **Property 6: Workflow Company Association**
    - **Validates: Requirements 4.1, 4.2, 4.4**
  
  - [x] 1.7 Create ExecutionState model with Mongoose schema
    - Define schema with requestId, workflowId, workflowVersion, companyId, currentNodeId, status fields
    - Define nested schemas for ParallelPath and ExecutionHistoryEntry
    - Add indexes for requestId (unique), companyId, and (companyId, status)
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_
  
  - [ ]* 1.8 Write property test for ExecutionState model
    - **Property 20: Execution State Persistence**
    - **Validates: Requirements 7.1**

- [ ] 2. Implement RoleService backend service
  - [x] 2.1 Create RoleService class with createRole method
    - Implement role creation with company association
    - Validate role name uniqueness within company
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 2.2 Write unit tests for createRole
    - Test valid role creation
    - Test duplicate role name rejection
    - _Requirements: 1.2_

  - [x] 2.3 Implement updateRole method
    - Update role name and description
    - Update references in existing workflows
    - _Requirements: 1.3_
  
  - [ ]* 2.4 Write property test for updateRole
    - **Property 2: Role Name Update Propagation**
    - **Validates: Requirements 1.3**
  
  - [x] 2.5 Implement deleteRole method with usage check
    - Check if role is used in any active workflow
    - Prevent deletion if role is in use
    - _Requirements: 1.4_
  
  - [ ]* 2.6 Write property test for deleteRole
    - **Property 3: Role Deletion Protection**
    - **Validates: Requirements 1.4**
  
  - [x] 2.7 Implement getRoles, assignUserToRole, removeUserFromRole methods
    - Query roles by company with multi-tenant isolation
    - Manage user-role assignments
    - _Requirements: 1.5, 10.1, 10.2_
  
  - [ ]* 2.8 Write property test for role assignment operations
    - **Property 28: Role Assignment Removal**
    - **Validates: Requirements 10.2**
  
  - [x] 2.9 Implement getUsersByRole and isRoleInUse methods
    - Query users assigned to specific role
    - Check if role is referenced in workflows
    - _Requirements: 10.3_
  
  - [ ]* 2.10 Write property test for getUsersByRole
    - **Property 29: Approval Node User Identification**
    - **Validates: Requirements 10.3**

- [ ] 3. Implement WorkflowValidator service
  - [x] 3.1 Create WorkflowValidator class with validateStructure method
    - Validate exactly one start node
    - Validate at least one end node
    - _Requirements: 5.1, 5.2_

  - [ ]* 3.2 Write property tests for start and end node validation
    - **Property 7: Workflow Validation - Single Start Node**
    - **Property 8: Workflow Validation - Minimum End Nodes**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 3.3 Implement validateConnections method
    - Check all nodes are reachable from start node
    - Validate parallel split-join matching
    - Validate conditional nodes have exactly two outputs (true/false)
    - _Requirements: 5.3, 5.4, 12.6_
  
  - [ ]* 3.4 Write property tests for connection validation
    - **Property 9: Workflow Validation - Node Reachability**
    - **Property 10: Workflow Validation - Parallel Split-Join Matching**
    - **Property 32: Conditional Node Two-Output Validation**
    - **Validates: Requirements 5.3, 5.4, 12.6**
  
  - [x] 3.5 Implement validateRoles method
    - Verify all referenced roles exist in company
    - _Requirements: 5.1-5.6_
  
  - [x] 3.6 Implement main validate method
    - Combine all validation checks
    - Return comprehensive ValidationResult
    - Prevent activation of invalid workflows
    - _Requirements: 5.5, 5.6_
  
  - [ ]* 3.7 Write property test for invalid workflow activation
    - **Property 11: Invalid Workflow Activation Prevention**
    - **Validates: Requirements 5.6**
  
  - [ ]* 3.8 Write unit tests for edge cases
    - Test empty workflow validation
    - Test single-node workflow validation
    - Test circular dependency detection
    - _Requirements: 5.1-5.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Implement WorkflowExecutionEngine service
  - [x] 5.1 Create WorkflowExecutionEngine class with initializeExecution method
    - Load active workflow for company
    - Create ExecutionState with start node as current
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 5.2 Write property tests for execution initialization
    - **Property 12: Execution Initialization at Start Node**
    - **Property 13: Execution Uses Company Workflow**
    - **Validates: Requirements 6.1, 6.2, 8.4**
  
  - [x] 5.3 Implement processAction method for approval nodes
    - Verify user has required role
    - Advance to next node
    - Record action in execution history
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 5.4 Write property tests for approval processing
    - **Property 14: Approval Advances to Next Node**
    - **Property 15: Role-Based Approval Authorization**
    - **Property 22: Step Completion User Tracking**
    - **Validates: Requirements 6.3, 6.4, 7.3**
  
  - [x] 5.5 Implement createParallelPaths method
    - Handle parallel split nodes
    - Create parallel path entries for each outgoing edge
    - _Requirements: 6.5_
  
  - [ ]* 5.6 Write property test for parallel split
    - **Property 16: Parallel Split Creates Multiple Paths**
    - **Validates: Requirements 6.5**
  
  - [x] 5.7 Implement checkParallelCompletion method
    - Handle parallel join nodes
    - Wait for all parallel paths to complete
    - _Requirements: 6.6_
  
  - [ ]* 5.8 Write property test for parallel join
    - **Property 17: Parallel Join Waits for All Paths**
    - **Validates: Requirements 6.6**

  - [x] 5.9 Implement evaluateCondition method
    - Evaluate conditional node expressions
    - Route to true or false path based on evaluation
    - _Requirements: 6.7, 12.3, 12.4, 12.5_
  
  - [ ]* 5.10 Write property test for conditional routing
    - **Property 18: Conditional Routing Based on Evaluation**
    - **Validates: Requirements 6.7, 12.3, 12.4, 12.5**
  
  - [x] 5.11 Implement end node handling
    - Mark execution as completed when reaching end node
    - Set completedAt timestamp
    - _Requirements: 6.8_
  
  - [ ]* 5.12 Write property test for execution completion
    - **Property 19: End Node Marks Completion**
    - **Validates: Requirements 6.8**
  
  - [x] 5.13 Implement getExecutionState method
    - Retrieve current execution state
    - Include history and parallel path information
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [ ]* 5.14 Write property test for timestamp recording
    - **Property 21: Step Completion Timestamp Recording**
    - **Validates: Requirements 7.2**
  
  - [ ]* 5.15 Write unit tests for execution engine
    - Test unauthorized user approval attempt
    - Test execution with parallel paths
    - Test conditional routing with various conditions
    - _Requirements: 6.1-6.8_

- [ ] 6. Implement workflow management API endpoints
  - [x] 6.1 Create POST /api/workflows endpoint
    - Accept WorkflowConfiguration in request body
    - Validate workflow before saving
    - Associate with company from session
    - _Requirements: 4.1, 8.3_

  - [ ]* 6.2 Write unit tests for POST /api/workflows
    - Test workflow creation with valid data
    - Test workflow creation with invalid data
    - Test multi-tenant isolation
    - _Requirements: 4.1, 8.3_
  
  - [x] 6.3 Create GET /api/workflows/:id endpoint
    - Retrieve workflow by ID
    - Verify company ownership
    - _Requirements: 4.3, 8.3_
  
  - [x] 6.4 Create PUT /api/workflows/:id endpoint
    - Update workflow configuration
    - Create new version
    - _Requirements: 9.1_
  
  - [ ]* 6.5 Write property test for workflow versioning
    - **Property 23: Workflow Version Increment on Update**
    - **Validates: Requirements 9.1**
  
  - [x] 6.6 Create DELETE /api/workflows/:id endpoint
    - Delete workflow if no active executions
    - _Requirements: 4.1_
  
  - [x] 6.7 Create GET /api/workflows/company/:companyId endpoint
    - List all workflows for company
    - Enforce multi-tenant isolation
    - _Requirements: 8.1, 8.3_
  
  - [ ]* 6.8 Write property test for multi-tenant isolation
    - **Property 4: Multi-Tenant Data Isolation**
    - **Validates: Requirements 1.5, 1.6, 4.3, 8.1, 8.2, 8.3, 8.5**
  
  - [x] 6.9 Create GET /api/workflows/:id/versions endpoint
    - Return version history for workflow
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 6.10 Write property test for version history
    - **Property 26: Workflow Version History Retention**
    - **Validates: Requirements 9.4**

  - [x] 6.11 Create POST /api/workflows/:id/validate endpoint
    - Validate workflow configuration
    - Return detailed validation results
    - _Requirements: 5.1-5.6_
  
  - [x] 6.12 Create POST /api/workflows/:id/activate endpoint
    - Set workflow as active version
    - Deactivate previous active version
    - _Requirements: 9.3_

- [ ] 7. Implement role management API endpoints
  - [x] 7.1 Create POST /api/roles endpoint
    - Create custom role for company
    - Validate role name uniqueness
    - _Requirements: 1.1, 1.2_
  
  - [x] 7.2 Create GET /api/roles/:id endpoint
    - Retrieve role details
    - Verify company ownership
    - _Requirements: 1.5_
  
  - [x] 7.3 Create PUT /api/roles/:id endpoint
    - Update role name and description
    - Trigger workflow reference updates
    - _Requirements: 1.3_
  
  - [x] 7.4 Create DELETE /api/roles/:id endpoint
    - Check if role is in use
    - Delete role if not in use
    - _Requirements: 1.4_
  
  - [x] 7.5 Create GET /api/roles/company/:companyId endpoint
    - List all roles for company
    - _Requirements: 1.5, 8.2_
  
  - [x] 7.6 Create POST /api/roles/:id/users endpoint
    - Assign user to role
    - _Requirements: 10.1_

  - [x] 7.7 Create DELETE /api/roles/:id/users/:userId endpoint
    - Remove user from role
    - _Requirements: 10.2_
  
  - [x] 7.8 Create GET /api/roles/:id/users endpoint
    - Get users assigned to role
    - _Requirements: 10.3_
  
  - [ ]* 7.9 Write unit tests for role API endpoints
    - Test role CRUD operations
    - Test user assignment operations
    - Test multi-tenant isolation
    - _Requirements: 1.1-1.6, 10.1-10.3_

- [ ] 8. Implement workflow execution API endpoints
  - [x] 8.1 Create POST /api/executions endpoint
    - Initialize workflow execution for request
    - Use active workflow version for company
    - _Requirements: 6.1, 6.2, 9.3_
  
  - [ ]* 8.2 Write property test for new execution version usage
    - **Property 25: New Executions Use Active Version**
    - **Validates: Requirements 9.3**
  
  - [x] 8.3 Create GET /api/executions/:id endpoint
    - Retrieve execution state
    - Include history and current position
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [x] 8.4 Create POST /api/executions/:id/actions endpoint
    - Process approval, rejection, or other actions
    - Validate user authorization
    - Update execution state
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 8.5 Write property test for any assigned user approval
    - **Property 30: Any Assigned User Can Approve**
    - **Validates: Requirements 10.5**

  - [x] 8.6 Create GET /api/executions/request/:requestId endpoint
    - Get execution state for specific request
    - _Requirements: 7.1_
  
  - [ ]* 8.7 Write property test for in-progress execution version stability
    - **Property 24: In-Progress Executions Use Original Version**
    - **Validates: Requirements 9.2**
  
  - [ ]* 8.8 Write unit tests for execution API endpoints
    - Test execution initialization
    - Test action processing
    - Test unauthorized access attempts
    - _Requirements: 6.1-6.8, 7.1-7.5_

- [x] 9. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create frontend WorkflowBuilder component
  - [x] 10.1 Set up React Flow canvas component
    - Initialize React Flow with custom node types
    - Configure canvas controls (zoom, pan)
    - _Requirements: 2.1, 2.5_
  
  - [x] 10.2 Create custom node components for each type
    - StartNode component
    - EndNode component
    - ApprovalNode component
    - ParallelSplitNode component
    - ParallelJoinNode component
    - ConditionalNode component
    - _Requirements: 3.1-3.5_
  
  - [x] 10.3 Implement node palette for drag-and-drop
    - Display available node types
    - Enable dragging nodes onto canvas
    - _Requirements: 2.1, 2.3, 3.6_

  - [x] 10.4 Implement connection drawing between nodes
    - Enable connecting nodes with edges
    - Validate connection compatibility
    - _Requirements: 2.2, 2.4, 11.3, 11.4_
  
  - [ ]* 10.5 Write property test for invalid connection prevention
    - **Property 31: Invalid Node Connection Prevention**
    - **Validates: Requirements 11.4**
  
  - [x] 10.6 Create node property editor panel
    - Display properties for selected node
    - Allow editing role selection for approval nodes
    - Allow editing conditions for conditional nodes
    - _Requirements: 2.7_
  
  - [x] 10.7 Implement node and edge deletion
    - Allow deleting selected nodes
    - Allow deleting selected edges
    - _Requirements: 2.6_
  
  - [x] 10.8 Add undo/redo functionality
    - Track workflow state changes
    - Implement undo and redo actions
    - _Requirements: 11.5_
  
  - [x] 10.9 Implement auto-layout feature
    - Arrange nodes for better clarity
    - _Requirements: 11.6_
  
  - [x] 10.10 Add tooltips and visual feedback
    - Tooltips for node types
    - Hover effects for connection points
    - Drag feedback
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 10.11 Implement save workflow functionality
    - Validate workflow before saving
    - Call workflow API to persist
    - Display validation errors
    - _Requirements: 4.1, 5.5_

  - [x] 10.12 Implement load workflow functionality
    - Fetch workflow from API
    - Render nodes and edges on canvas
    - Handle empty workflow (default canvas)
    - _Requirements: 4.3, 4.5_
  
  - [ ]* 10.13 Write unit tests for WorkflowBuilder component
    - Test node drag and drop
    - Test connection creation
    - Test node deletion
    - Test save and load operations
    - _Requirements: 2.1-2.7, 11.1-11.6_

- [ ] 11. Create frontend RoleManagement component
  - [x] 11.1 Create role list view
    - Display all roles for company
    - Show usage indicator
    - _Requirements: 1.5_
  
  - [x] 11.2 Create role creation form
    - Input fields for name and description
    - Submit to role API
    - _Requirements: 1.1, 1.2_
  
  - [x] 11.3 Implement role edit functionality
    - Edit role name and description
    - Update via API
    - _Requirements: 1.3_
  
  - [x] 11.4 Implement role deletion with protection
    - Check if role is in use
    - Prevent deletion if in use
    - Show appropriate error message
    - _Requirements: 1.4_
  
  - [x] 11.5 Create user assignment interface
    - List users in company
    - Assign/remove users to/from roles
    - _Requirements: 10.1, 10.2_
  
  - [ ]* 11.6 Write unit tests for RoleManagement component
    - Test role CRUD operations
    - Test user assignment UI
    - Test deletion protection
    - _Requirements: 1.1-1.6, 10.1-10.2_


- [x] 12. Create frontend WorkflowViewer component
  - [x] 12.1 Create read-only workflow visualization
    - Display workflow using React Flow in read-only mode
    - Show all nodes and connections
    - _Requirements: 7.4_
  
  - [x] 12.2 Implement current position highlighting
    - Highlight current node in execution
    - Show completed nodes
    - Show pending nodes
    - _Requirements: 7.4, 7.5_
  
  - [x] 12.3 Display execution history
    - Show timeline of completed steps
    - Display user and timestamp for each action
    - _Requirements: 7.2, 7.3, 7.5_
  
  - [ ]* 12.4 Write unit tests for WorkflowViewer component
    - Test workflow rendering
    - Test position highlighting
    - Test history display
    - _Requirements: 7.1-7.5_

- [ ] 13. Integrate with existing Request model
  - [x] 13.1 Extend Request schema with workflow fields
    - Add workflowExecutionId field
    - Add useCustomWorkflow boolean field
    - _Requirements: 6.1_
  
  - [x] 13.2 Update request submission logic
    - Check if company has active custom workflow
    - Initialize workflow execution if custom workflow exists
    - Fall back to legacy workflow if no custom workflow
    - _Requirements: 6.1, 6.2_
  
  - [x] 13.3 Update request approval logic
    - Route approval actions through WorkflowExecutionEngine
    - Update request status based on workflow completion
    - _Requirements: 6.3, 6.8_

  - [ ]* 13.4 Write integration tests for Request-Workflow integration
    - Test request submission with custom workflow
    - Test request submission without custom workflow (legacy)
    - Test approval flow through custom workflow
    - _Requirements: 6.1-6.8_

- [ ] 14. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create comprehensive property-based test suite
  - [ ]* 15.1 Write remaining property tests for workflow execution
    - Test properties not yet covered in previous tasks
    - Ensure 100+ iterations per test
    - _Requirements: All_
  
  - [ ]* 15.2 Write property tests for concurrent operations
    - Test concurrent workflow executions
    - Test concurrent role assignments
    - Test concurrent workflow updates
    - _Requirements: 8.1-8.5_
  
  - [ ]* 15.3 Write property tests for data integrity
    - Test multi-tenant isolation under load
    - Test version consistency during updates
    - _Requirements: 8.1-8.5, 9.1-9.5_

- [ ] 16. Create end-to-end integration tests
  - [ ]* 16.1 Write E2E test for complete workflow lifecycle
    - Admin creates roles
    - Admin builds workflow
    - Admin activates workflow
    - User submits request
    - Approvers process through workflow
    - Request completes
    - _Requirements: All_
  
  - [ ]* 16.2 Write E2E test for workflow versioning scenario
    - Admin creates initial workflow
    - Requests start processing
    - Admin updates workflow
    - Existing requests continue on old version
    - New requests use new version
    - _Requirements: 9.1-9.5_

  - [ ]* 16.3 Write E2E test for parallel approval scenario
    - Create workflow with parallel split and join
    - Submit request
    - Multiple approvers act on parallel paths
    - Verify join waits for all paths
    - _Requirements: 6.5, 6.6_
  
  - [ ]* 16.4 Write E2E test for conditional routing scenario
    - Create workflow with conditional node
    - Submit requests with different properties
    - Verify correct routing based on conditions
    - _Requirements: 6.7, 12.1-12.6_

- [ ] 17. Add error handling and validation
  - [ ] 17.1 Implement comprehensive error handling in API endpoints
    - Add try-catch blocks with appropriate error responses
    - Return consistent error format
    - _Requirements: All_
  
  - [ ] 17.2 Add input validation using Zod schemas
    - Validate workflow configuration structure
    - Validate role data
    - Validate execution actions
    - _Requirements: All_
  
  - [ ] 17.3 Implement authorization middleware
    - Verify user's company matches requested resource
    - Prevent cross-company access
    - _Requirements: 8.1-8.5_
  
  - [ ]* 17.4 Write unit tests for error handling
    - Test validation errors
    - Test authorization errors
    - Test multi-tenant security errors
    - _Requirements: 8.1-8.5_

- [ ] 18. Final checkpoint and documentation
  - [ ] 18.1 Run full test suite
    - Execute all unit tests
    - Execute all property-based tests
    - Execute all integration tests
    - Verify all tests pass

  
  - [ ] 18.2 Verify all requirements are covered
    - Cross-reference tasks with requirements document
    - Ensure all acceptance criteria are met
    - _Requirements: All_
  
  - [ ] 18.3 Add inline code documentation
    - Document complex algorithms
    - Add JSDoc comments to public interfaces
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript, React 18, Next.js 14, MongoDB with Mongoose, and React Flow
- All property tests must include comment tags: `// Feature: customizable-approval-workflows, Property {number}: {property_text}`
- Multi-tenant isolation is enforced at all layers through company-scoped queries and middleware validation
- Workflow versioning ensures in-progress requests continue on their original version while new requests use the latest active version
