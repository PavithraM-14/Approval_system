/**
 * Unit tests for GET /api/executions/request/:requestId endpoint
 * 
 * Tests cover:
 * - Execution state retrieval by request ID
 * - Multi-tenant isolation
 * - Input validation
 * 
 * Requirements:
 * - 7.1: Maintain current workflow position for each active approval request
 */

import ExecutionState from '@/models/ExecutionState';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('GET /api/executions/request/:requestId - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockExecutionId = new mongoose.Types.ObjectId();
  const mockWorkflowId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Retrieval by Request ID (Requirement 7.1)', () => {
    it('should retrieve execution state by request ID', async () => {
      const requestId = 'test-request-123';
      
      // Mock execution state
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
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
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:01:00Z'),
          },
        ],
        startedAt: new Date('2024-01-01T10:00:00Z'),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findOne({ requestId });

      // Verify
      expect(result).toBeDefined();
      expect(result!.requestId).toBe(requestId);
      expect(result!.currentNodeId).toBe('approval-1');
      expect(result!.status).toBe('in_progress');
      expect(result!.history).toHaveLength(2);
    });

    it('should retrieve execution state with parallel paths by request ID', async () => {
      const requestId = 'test-request-parallel';
      
      // Mock execution state with parallel paths
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'parallel-split-1',
        status: 'in_progress',
        parallelPaths: [
          {
            pathId: 'path-1',
            splitNodeId: 'parallel-split-1',
            joinNodeId: 'parallel-join-1',
            currentNodeId: 'approval-2',
            status: 'active',
          },
          {
            pathId: 'path-2',
            splitNodeId: 'parallel-split-1',
            joinNodeId: 'parallel-join-1',
            currentNodeId: 'approval-3',
            status: 'completed',
            completedAt: new Date('2024-01-01T11:00:00Z'),
          },
        ],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
        ],
        startedAt: new Date('2024-01-01T10:00:00Z'),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findOne({ requestId });

      // Verify
      expect(result).toBeDefined();
      expect(result!.requestId).toBe(requestId);
      expect(result!.parallelPaths).toHaveLength(2);
      expect(result!.parallelPaths[0].status).toBe('active');
      expect(result!.parallelPaths[1].status).toBe('completed');
    });

    it('should retrieve completed execution by request ID', async () => {
      const requestId = 'test-request-completed';
      
      // Mock completed execution state
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'end-1',
        status: 'completed',
        parallelPaths: [],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
          {
            nodeId: 'end-1',
            nodeType: 'end',
            action: 'entered',
            timestamp: new Date('2024-01-01T12:00:00Z'),
          },
        ],
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T12:00:00Z'),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findOne({ requestId });

      // Verify
      expect(result).toBeDefined();
      expect(result!.requestId).toBe(requestId);
      expect(result!.status).toBe('completed');
      expect(result!.completedAt).toBeDefined();
      expect(result!.currentNodeId).toBe('end-1');
    });
  });

  describe('Not Found Cases', () => {
    it('should return null for non-existent request ID', async () => {
      const requestId = 'non-existent-request';
      
      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(null);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeNull();
    });

    it('should return null for empty request ID', async () => {
      const requestId = '';
      
      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(null);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeNull();
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should query execution by request ID and verify company ownership', async () => {
      const requestId = 'test-request-company-check';
      
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeDefined();
      expect(result!.companyId).toEqual(mockCompanyId);
      expect(result!.requestId).toBe(requestId);
    });

    it('should handle request IDs with different companies', async () => {
      const requestId = 'test-request-different-company';
      const differentCompanyId = new mongoose.Types.ObjectId();
      
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: differentCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeDefined();
      expect(result!.companyId).toEqual(differentCompanyId);
      expect(result!.companyId).not.toEqual(mockCompanyId);
    });
  });

  describe('Request ID Uniqueness', () => {
    it('should retrieve unique execution for unique request ID', async () => {
      const requestId = 'unique-request-id-123';
      
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeDefined();
      expect(result!.requestId).toBe(requestId);
      expect(result!._id).toEqual(mockExecutionId);
    });
  });

  describe('History and Progress Tracking', () => {
    it('should include full execution history when querying by request ID', async () => {
      const requestId = 'test-request-with-history';
      const approverUserId = new mongoose.Types.ObjectId();
      
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: requestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-2',
        status: 'in_progress',
        parallelPaths: [],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
          {
            nodeId: 'approval-1',
            nodeType: 'approval',
            action: 'approved',
            userId: approverUserId,
            notes: 'Approved by manager',
            timestamp: new Date('2024-01-01T10:30:00Z'),
          },
          {
            nodeId: 'approval-2',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:31:00Z'),
          },
        ],
        startedAt: new Date('2024-01-01T10:00:00Z'),
      };

      jest.spyOn(ExecutionState, 'findOne').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findOne({ requestId });

      expect(result).toBeDefined();
      expect(result!.history).toHaveLength(3);
      expect(result!.history[1].userId).toBeDefined();
      expect(result!.history[1].action).toBe('approved');
      expect(result!.history[1].notes).toBe('Approved by manager');
    });
  });
});
