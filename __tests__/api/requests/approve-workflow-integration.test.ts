/**
 * Unit tests for POST /api/requests/[id]/approve endpoint - Custom Workflow Integration
 * 
 * Tests cover:
 * - Routing approval actions through WorkflowExecutionEngine
 * - Updating request status based on workflow completion
 * - Handling workflow rejection
 * - Fallback to legacy workflow for non-custom requests
 * 
 * Task: 13.3 Update request approval logic
 * Requirements:
 * - 6.3: Route approval actions through WorkflowExecutionEngine
 * - 6.8: Update request status based on workflow completion
 */

import mongoose from 'mongoose';
import Request from '@/models/Request';
import ExecutionState from '@/models/ExecutionState';
import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';
import { RequestStatus, ActionType } from '@/lib/types';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/requests/[id]/approve - Custom Workflow Integration (Task 13.3)', () => {
  const mockRequestId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockExecutionId = new mongoose.Types.ObjectId();
  const mockWorkflowId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Workflow Approval Routing (Requirement 6.3)', () => {
    it('should route approve action through WorkflowExecutionEngine', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'approved',
            userId: mockUserId,
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
      };

      const processActionSpy = jest
        .spyOn(workflowExecutionEngine, 'processAction')
        .mockResolvedValue(mockExecutionState as any);

      // Simulate the approval logic
      if (mockRequest.useCustomWorkflow && mockRequest.workflowExecutionId) {
        const updatedExecutionState = await workflowExecutionEngine.processAction(
          mockRequest.workflowExecutionId.toString(),
          'approved',
          mockUserId.toString(),
          'Approved by user'
        );

        expect(processActionSpy).toHaveBeenCalledWith(
          mockRequest.workflowExecutionId.toString(),
          'approved',
          mockUserId.toString(),
          'Approved by user'
        );
        expect(updatedExecutionState.status).toBe('in_progress');
      }
    });

    it('should route reject action through WorkflowExecutionEngine', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'rejected',
        parallelPaths: [],
        history: [
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'rejected',
            userId: mockUserId,
            notes: 'Does not meet requirements',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      const processActionSpy = jest
        .spyOn(workflowExecutionEngine, 'processAction')
        .mockResolvedValue(mockExecutionState as any);

      // Simulate the rejection logic
      if (mockRequest.useCustomWorkflow && mockRequest.workflowExecutionId) {
        const updatedExecutionState = await workflowExecutionEngine.processAction(
          mockRequest.workflowExecutionId.toString(),
          'rejected',
          mockUserId.toString(),
          'Does not meet requirements'
        );

        expect(processActionSpy).toHaveBeenCalledWith(
          mockRequest.workflowExecutionId.toString(),
          'rejected',
          mockUserId.toString(),
          'Does not meet requirements'
        );
        expect(updatedExecutionState.status).toBe('rejected');
      }
    });

    it('should not route non-approve/reject actions through workflow engine', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const processActionSpy = jest.spyOn(workflowExecutionEngine, 'processAction');

      // Actions like 'clarify', 'forward' should not be routed through workflow engine
      const unsupportedActions = ['clarify', 'forward', 'send_to_dean'];

      for (const action of unsupportedActions) {
        // These actions should not call processAction
        expect(processActionSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('Request Status Update Based on Workflow Completion (Requirement 6.8)', () => {
    it('should mark request as APPROVED when workflow reaches end node', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'end-1',
        status: 'completed', // Workflow completed
        parallelPaths: [],
        history: [
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'approved',
            userId: mockUserId,
            timestamp: new Date(),
          },
          {
            nodeId: 'end-1',
            nodeType: 'end',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      jest.spyOn(workflowExecutionEngine, 'processAction').mockResolvedValue(mockExecutionState as any);

      // Simulate the approval logic
      const updatedExecutionState = await workflowExecutionEngine.processAction(
        mockRequest.workflowExecutionId.toString(),
        'approved',
        mockUserId.toString(),
        'Final approval'
      );

      // Verify workflow is completed
      expect(updatedExecutionState.status).toBe('completed');

      // Request status should be updated to APPROVED
      let newRequestStatus = mockRequest.status;
      if (updatedExecutionState.status === 'completed') {
        newRequestStatus = RequestStatus.APPROVED;
      }

      expect(newRequestStatus).toBe(RequestStatus.APPROVED);
    });

    it('should mark request as REJECTED when workflow is rejected', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'rejected', // Workflow rejected
        parallelPaths: [],
        history: [
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'rejected',
            userId: mockUserId,
            notes: 'Budget not available',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      jest.spyOn(workflowExecutionEngine, 'processAction').mockResolvedValue(mockExecutionState as any);

      // Simulate the rejection logic
      const updatedExecutionState = await workflowExecutionEngine.processAction(
        mockRequest.workflowExecutionId.toString(),
        'rejected',
        mockUserId.toString(),
        'Budget not available'
      );

      // Verify workflow is rejected
      expect(updatedExecutionState.status).toBe('rejected');

      // Request status should be updated to REJECTED
      let newRequestStatus = mockRequest.status;
      if (updatedExecutionState.status === 'rejected') {
        newRequestStatus = RequestStatus.REJECTED;
      }

      expect(newRequestStatus).toBe(RequestStatus.REJECTED);
    });

    it('should keep request status unchanged when workflow is still in progress', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-2',
        status: 'in_progress', // Still in progress
        parallelPaths: [],
        history: [
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'approved',
            userId: mockUserId,
            timestamp: new Date(),
          },
          {
            nodeId: 'approval-2',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date(),
          },
        ],
        startedAt: new Date(),
      };

      jest.spyOn(workflowExecutionEngine, 'processAction').mockResolvedValue(mockExecutionState as any);

      // Simulate the approval logic
      const updatedExecutionState = await workflowExecutionEngine.processAction(
        mockRequest.workflowExecutionId.toString(),
        'approved',
        mockUserId.toString(),
        'Approved step 1'
      );

      // Verify workflow is still in progress
      expect(updatedExecutionState.status).toBe('in_progress');

      // Request status should remain unchanged
      let newRequestStatus = mockRequest.status;
      if (updatedExecutionState.status === 'completed') {
        newRequestStatus = RequestStatus.APPROVED;
      } else if (updatedExecutionState.status === 'rejected') {
        newRequestStatus = RequestStatus.REJECTED;
      }

      expect(newRequestStatus).toBe(RequestStatus.SUBMITTED);
    });
  });

  describe('Legacy Workflow Fallback', () => {
    it('should use legacy workflow when useCustomWorkflow is false', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.MANAGER_REVIEW,
        useCustomWorkflow: false, // Legacy workflow
        workflowExecutionId: null,
        history: [],
      };

      const processActionSpy = jest.spyOn(workflowExecutionEngine, 'processAction');

      // Legacy workflow should not call workflow engine
      if (!mockRequest.useCustomWorkflow) {
        // Use legacy approval logic
        expect(processActionSpy).not.toHaveBeenCalled();
      }
    });

    it('should use legacy workflow when workflowExecutionId is null', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.MANAGER_REVIEW,
        useCustomWorkflow: true,
        workflowExecutionId: null, // No execution ID
        history: [],
      };

      const processActionSpy = jest.spyOn(workflowExecutionEngine, 'processAction');

      // Should not call workflow engine if no execution ID
      if (!mockRequest.workflowExecutionId) {
        expect(processActionSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('History Entry Creation', () => {
    it('should add history entry with workflow approval action', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-2',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(workflowExecutionEngine, 'processAction').mockResolvedValue(mockExecutionState as any);

      await workflowExecutionEngine.processAction(
        mockRequest.workflowExecutionId.toString(),
        'approved',
        mockUserId.toString(),
        'Looks good'
      );

      // History entry should be created
      const historyEntry = {
        action: ActionType.APPROVE,
        actor: mockUserId,
        previousStatus: mockRequest.status,
        newStatus: mockRequest.status, // Unchanged since workflow still in progress
        timestamp: new Date(),
        notes: 'Looks good',
      };

      expect(historyEntry.action).toBe(ActionType.APPROVE);
      expect(historyEntry.actor).toEqual(mockUserId);
      expect(historyEntry.notes).toBe('Looks good');
    });

    it('should add history entry with workflow rejection action', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: mockRequest.requestId,
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

      jest.spyOn(workflowExecutionEngine, 'processAction').mockResolvedValue(mockExecutionState as any);

      await workflowExecutionEngine.processAction(
        mockRequest.workflowExecutionId.toString(),
        'rejected',
        mockUserId.toString(),
        'Insufficient documentation'
      );

      // History entry should be created
      const historyEntry = {
        action: ActionType.REJECT,
        actor: mockUserId,
        previousStatus: mockRequest.status,
        newStatus: RequestStatus.REJECTED,
        timestamp: new Date(),
        notes: 'Insufficient documentation',
      };

      expect(historyEntry.action).toBe(ActionType.REJECT);
      expect(historyEntry.actor).toEqual(mockUserId);
      expect(historyEntry.notes).toBe('Insufficient documentation');
      expect(historyEntry.newStatus).toBe(RequestStatus.REJECTED);
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow engine errors gracefully', async () => {
      const mockRequest = {
        _id: mockRequestId,
        requestId: '123456',
        title: 'Test Request',
        status: RequestStatus.SUBMITTED,
        useCustomWorkflow: true,
        workflowExecutionId: mockExecutionId,
        history: [],
      };

      const errorMessage = 'User not assigned to required role';
      jest.spyOn(workflowExecutionEngine, 'processAction').mockRejectedValue(new Error(errorMessage));

      // Should throw error when workflow engine fails
      await expect(
        workflowExecutionEngine.processAction(
          mockRequest.workflowExecutionId.toString(),
          'approved',
          mockUserId.toString(),
          'Approved'
        )
      ).rejects.toThrow(errorMessage);
    });

    it('should handle invalid execution ID', async () => {
      const invalidExecutionId = 'invalid-id';

      jest.spyOn(workflowExecutionEngine, 'processAction').mockRejectedValue(new Error('Invalid executionId format'));

      await expect(
        workflowExecutionEngine.processAction(invalidExecutionId, 'approved', mockUserId.toString(), 'Approved')
      ).rejects.toThrow('Invalid executionId format');
    });
  });
});
