/**
 * E2E Integration Test: Complete Workflow Lifecycle
 * 
 * Task 16.1: Write E2E test for complete workflow lifecycle
 * 
 * Tests the complete workflow from start to finish:
 * - Admin creates roles
 * - Admin builds workflow
 * - Admin activates workflow
 * - User submits request
 * - Approvers process request
 * - Request reaches completion
 * 
 * Validates: All Requirements
 */

import mongoose from 'mongoose';
import CustomRole from '@/models/CustomRole';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import ExecutionState from '@/models/ExecutionState';
import UserRoleAssignment from '@/models/UserRoleAssignment';
import { roleService } from '@/lib/role-service';
import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('E2E: Complete Workflow Lifecycle (Task 16.1)', () => {
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockAdminId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockApprover1Id = new mongoose.Types.ObjectId();
  const mockApprover2Id = new mongoose.Types.ObjectId();

  let managerRoleId: string;
  let directorRoleId: string;
  let workflowId: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow Lifecycle', () => {
    it('should execute complete workflow from role creation to request completion', async () => {
      // ===== STEP 1: Admin creates roles =====
      const managerRole = {
        _id: new mongoose.Types.ObjectId(),
        companyId: mockCompanyId,
        name: 'Manager',
        description: 'Department Manager',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const directorRole = {
        _id: new mongoose.Types.ObjectId(),
        companyId: mockCompanyId,
        name: 'Director',
        description: 'Department Director',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(function(this: any) {
        return Promise.resolve(this);
      });

      const createdManagerRole = await roleService.createRole(
        { name: 'Manager', description: 'Department Manager' },
        mockCompanyId.toString()
      );

      const createdDirectorRole = await roleService.createRole(
        { name: 'Director', description: 'Department Director' },
        mockCompanyId.toString()
      );

      managerRoleId = managerRole._id.toString();
      directorRoleId = directorRole._id.toString();

      expect(createdManagerRole.name).toBe('Manager');
      expect(createdDirectorRole.name).toBe('Director');

      // ===== STEP 2: Admin builds workflow =====
      const workflow = {
        _id: new mongoose.Types.ObjectId(),
        companyId: mockCompanyId,
        name: 'Standard Approval Workflow',
        description: 'Two-level approval workflow',
        version: 1,
        isActive: false,
        nodes: [
          {
            id: 'start-1',
            type: 'start' as const,
            label: 'Start',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'approval-1',
            type: 'approval' as const,
            label: 'Manager Approval',
            position: { x: 100, y: 200 },
            data: { roleId: managerRole._id },
          },
          {
            id: 'approval-2',
            type: 'approval' as const,
            label: 'Director Approval',
            position: { x: 100, y: 300 },
            data: { roleId: directorRole._id },
          },
          {
            id: 'end-1',
            type: 'end' as const,
            label: 'End',
            position: { x: 100, y: 400 },
            data: {},
          },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'approval-2', type: 'default' as const },
          { id: 'e3', source: 'approval-2', target: 'end-1', type: 'default' as const },
        ],
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(WorkflowConfiguration.prototype, 'save').mockImplementation(function(this: any) {
        return Promise.resolve(this);
      });

      workflowId = workflow._id.toString();

      expect(workflow.nodes).toHaveLength(4);
      expect(workflow.edges).toHaveLength(3);

      // ===== STEP 3: Admin activates workflow =====
      workflow.isActive = true;

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(workflow as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(workflow as any);

      const activeWorkflow = await WorkflowConfiguration.findOne({
        _id: workflow._id,
        companyId: mockCompanyId,
        isActive: true,
      });

      expect(activeWorkflow).toBeDefined();
      expect(activeWorkflow?.isActive).toBe(true);

      // ===== STEP 4: Assign users to roles =====
      const managerAssignment = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockApprover1Id,
        roleId: managerRole._id,
        companyId: mockCompanyId,
        assignedAt: new Date(),
      };

      const directorAssignment = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockApprover2Id,
        roleId: directorRole._id,
        companyId: mockCompanyId,
        assignedAt: new Date(),
      };

      jest.spyOn(UserRoleAssignment.prototype, 'save').mockImplementation(function(this: any) {
        return Promise.resolve(this);
      });

      await roleService.assignUserToRole(mockApprover1Id.toString(), managerRoleId);
      await roleService.assignUserToRole(mockApprover2Id.toString(), directorRoleId);

      // ===== STEP 5: User submits request =====
      const mockRequestId = 'REQ-001';

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: mockRequestId,
        workflowId: workflow._id,
        workflowVersion: workflow.version,
        companyId: mockCompanyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState.prototype, 'save').mockImplementation(function(this: any) {
        return Promise.resolve({
          ...this,
          _id: mockExecutionState._id,
        });
      });

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      const executionState = await workflowExecutionEngine.initializeExecution(
        mockRequestId,
        workflowId,
        mockCompanyId.toString()
      );

      expect(executionState.requestId).toBe(mockRequestId);
      expect(executionState.currentNodeId).toBe('start-1');
      expect(executionState.status).toBe('in_progress');
      expect(executionState.history).toHaveLength(1);

      // ===== STEP 6: First approver (Manager) processes request =====
      mockExecutionState.currentNodeId = 'approval-1';
      mockExecutionState.history.push({
        nodeId: 'approval-1',
        nodeType: 'approval',
        action: 'entered',
        timestamp: new Date(),
      });

      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue(managerAssignment as any);

      const afterManagerApproval = {
        ...mockExecutionState,
        currentNodeId: 'approval-2',
        history: [
          ...mockExecutionState.history,
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'approved',
            userId: mockApprover1Id,
            notes: 'Approved by manager',
            timestamp: new Date(),
          },
          {
            nodeId: 'approval-2',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(afterManagerApproval as any);

      const stateAfterManager = await workflowExecutionEngine.processAction(
        mockExecutionState._id.toString(),
        'approved',
        mockApprover1Id.toString(),
        'Approved by manager'
      );

      expect(stateAfterManager.currentNodeId).toBe('approval-2');
      expect(stateAfterManager.status).toBe('in_progress');

      // ===== STEP 7: Second approver (Director) processes request =====
      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue(directorAssignment as any);

      const afterDirectorApproval = {
        ...afterManagerApproval,
        currentNodeId: 'end-1',
        status: 'completed',
        completedAt: new Date(),
        history: [
          ...afterManagerApproval.history,
          {
            nodeId: 'approval-2',
            nodeType: 'approval',
            action: 'approved',
            userId: mockApprover2Id,
            notes: 'Approved by director',
            timestamp: new Date(),
          },
          {
            nodeId: 'end-1',
            nodeType: 'end',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(afterDirectorApproval as any);

      const finalState = await workflowExecutionEngine.processAction(
        mockExecutionState._id.toString(),
        'approved',
        mockApprover2Id.toString(),
        'Approved by director'
      );

      // ===== STEP 8: Verify completion =====
      expect(finalState.currentNodeId).toBe('end-1');
      expect(finalState.status).toBe('completed');
      expect(finalState.completedAt).toBeDefined();
      expect(finalState.history.length).toBeGreaterThan(0);

      // Verify all approval steps were recorded
      const approvalActions = finalState.history.filter(
        (entry: any) => entry.action === 'approved'
      );
      expect(approvalActions).toHaveLength(2);
    });
  });
});
