/**
 * Unit tests for POST /api/executions/:id/actions endpoint
 * 
 * Tests cover:
 * - Action processing (approve/reject)
 * - User authorization validation
 * - Execution state updates
 * - Multi-tenant isolation
 * - Input validation
 * 
 * Requirements:
 * - 6.3: Advance request to next node when approval step is completed
 * - 6.4: Require action from user assigned to specified role
 */

import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';
import ExecutionState from '@/models/ExecutionState';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import UserRoleAssignment from '@/models/UserRoleAssignment';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/executions/:id/actions - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockWorkflowId = new mongoose.Types.ObjectId();
  const mockExecutionId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockRoleId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Approval Action Processing (Requirements 6.3, 6.4)', () => {
    it('should process approval and advance to next node', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Manager Approval',
            position: { x: 100, y: 100 },
            data: { roleId: mockRoleId },
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 200 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'approval-1',
          },
          {
            id: 'edge-2',
            source: 'approval-1',
            target: 'end-1',
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: new Date(),
          },
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
        save: jest.fn().mockImplementation(function(this: any) {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(mockWorkflow as any);
      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        roleId: mockRoleId,
        companyId: mockCompanyId,
      } as any);

      const result = await workflowExecutionEngine.processAction(
        mockExecutionId.toString(),
        'approved',
        mockUserId.toString(),
        'Looks good'
      );

      expect(result).toBeDefined();
      expect(result.currentNodeId).toBe('end-1');
      expect(result.status).toBe('completed');
      expect(result.history.length).toBeGreaterThan(2);
      
      // Verify approval action was recorded
      const approvalAction = result.history.find(
        (h: any) => h.nodeId === 'approval-1' && h.action === 'approved'
      );
      expect(approvalAction).toBeDefined();
      expect(approvalAction?.userId?.toString()).toBe(mockUserId.toString());
      expect(approvalAction?.notes).toBe('Looks good');
    });

    it('should process rejection and mark execution as rejected', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Manager Approval',
            position: { x: 100, y: 100 },
            data: { roleId: mockRoleId },
          },
        ],
        edges: [],
        createdBy: new mongoose.Types.ObjectId(),
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        save: jest.fn().mockImplementation(function(this: any) {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(mockWorkflow as any);
      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        roleId: mockRoleId,
        companyId: mockCompanyId,
      } as any);

      const result = await workflowExecutionEngine.processAction(
        mockExecutionId.toString(),
        'rejected',
        mockUserId.toString(),
        'Does not meet requirements'
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('rejected');
      expect(result.completedAt).toBeDefined();
      
      // Verify rejection action was recorded
      const rejectionAction = result.history.find(
        (h: any) => h.action === 'rejected'
      );
      expect(rejectionAction).toBeDefined();
      expect(rejectionAction?.notes).toBe('Does not meet requirements');
    });

    it('should validate user has required role (Requirement 6.4)', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Manager Approval',
            position: { x: 100, y: 100 },
            data: { roleId: mockRoleId },
          },
        ],
        edges: [],
        createdBy: new mongoose.Types.ObjectId(),
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(mockWorkflow as any);
      
      // User does not have the required role
      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue(null);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('not assigned to the required role');
    });

    it('should record action with timestamp and user ID', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Manager Approval',
            position: { x: 100, y: 100 },
            data: { roleId: mockRoleId },
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 200 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'approval-1',
            target: 'end-1',
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        save: jest.fn().mockImplementation(function(this: any) {
          return Promise.resolve(this);
        }),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(mockWorkflow as any);
      jest.spyOn(UserRoleAssignment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        roleId: mockRoleId,
        companyId: mockCompanyId,
      } as any);

      const beforeTime = new Date();
      const result = await workflowExecutionEngine.processAction(
        mockExecutionId.toString(),
        'approved',
        mockUserId.toString()
      );
      const afterTime = new Date();

      const approvalAction = result.history.find(
        (h: any) => h.action === 'approved'
      );
      
      expect(approvalAction).toBeDefined();
      expect(approvalAction?.userId?.toString()).toBe(mockUserId.toString());
      expect(approvalAction?.timestamp).toBeDefined();
      expect(new Date(approvalAction!.timestamp).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(new Date(approvalAction!.timestamp).getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Input Validation', () => {
    it('should reject missing executionId', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          '',
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject missing action', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          '' as any,
          mockUserId.toString()
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject missing userId', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          ''
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject invalid executionId format', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          'invalid-id',
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('Invalid executionId format');
    });

    it('should reject invalid userId format', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          'invalid-id'
        )
      ).rejects.toThrow('Invalid userId format');
    });

    it('should reject invalid action value', async () => {
      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'invalid-action' as any,
          mockUserId.toString()
        )
      ).rejects.toThrow('Invalid action');
    });
  });

  describe('Execution State Validation', () => {
    it('should reject action on non-existent execution', async () => {
      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(null);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('Execution state not found');
    });

    it('should reject action on completed execution', async () => {
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'end-1',
        status: 'completed',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('not in progress');
    });

    it('should reject action on rejected execution', async () => {
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'rejected',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('not in progress');
    });

    it('should reject action on non-approval node', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 1,
        isActive: true,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
        ],
        edges: [],
        createdBy: new mongoose.Types.ObjectId(),
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(mockWorkflow as any);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('not an approval node');
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow not found', async () => {
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-123',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);
      jest.spyOn(WorkflowConfiguration, 'findById').mockResolvedValue(null);

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('Workflow not found');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(ExecutionState, 'findById').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        workflowExecutionEngine.processAction(
          mockExecutionId.toString(),
          'approved',
          mockUserId.toString()
        )
      ).rejects.toThrow('Database connection failed');
    });
  });
});
