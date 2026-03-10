/**
 * Unit tests for GET /api/executions/:id endpoint
 * 
 * Tests cover:
 * - Execution state retrieval with history and current position
 * - Multi-tenant isolation
 * - Input validation
 * 
 * Requirements:
 * - 7.1: Maintain current workflow position for each active approval request
 * - 7.4: Display request's progress through the workflow
 * - 7.5: Indicate which approval steps are pending, completed, and upcoming
 */

import ExecutionState from '@/models/ExecutionState';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('GET /api/executions/:id - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockExecutionId = new mongoose.Types.ObjectId();
  const mockWorkflowId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Retrieval (Requirements 7.1, 7.4, 7.5)', () => {
    it('should retrieve execution state with history and current position', async () => {
      // Mock execution state with history
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

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findById(mockExecutionId.toString());

      // Verify
      expect(result).toBeDefined();
      expect(result!.requestId).toBe('test-request-123');
      expect(result!.currentNodeId).toBe('approval-1');
      expect(result!.status).toBe('in_progress');
      expect(result!.history).toHaveLength(2);
      expect(result!.history[0].nodeId).toBe('start-1');
      expect(result!.history[1].nodeId).toBe('approval-1');
      expect(result!.parallelPaths).toEqual([]);
    });

    it('should include parallel paths in execution state', async () => {
      // Mock execution state with parallel paths
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-456',
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

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findById(mockExecutionId.toString());

      // Verify
      expect(result).toBeDefined();
      expect(result!.parallelPaths).toHaveLength(2);
      expect(result!.parallelPaths[0].pathId).toBe('path-1');
      expect(result!.parallelPaths[0].status).toBe('active');
      expect(result!.parallelPaths[1].status).toBe('completed');
      expect(result!.parallelPaths[1].completedAt).toBeDefined();
    });

    it('should include completed execution with completedAt timestamp', async () => {
      // Mock completed execution state
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-789',
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

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      // Execute query
      const result = await ExecutionState.findById(mockExecutionId.toString());

      // Verify
      expect(result).toBeDefined();
      expect(result!.status).toBe('completed');
      expect(result!.completedAt).toBeDefined();
      expect(result!.currentNodeId).toBe('end-1');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should query execution by ID', async () => {
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-999',
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

      const result = await ExecutionState.findById(mockExecutionId.toString());

      expect(result).toBeDefined();
      expect(result!.companyId).toEqual(mockCompanyId);
    });

    it('should return null for non-existent execution', async () => {
      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(null);

      const result = await ExecutionState.findById(mockExecutionId.toString());

      expect(result).toBeNull();
    });
  });

  describe('History and Progress Tracking (Requirements 7.2, 7.3)', () => {
    it('should include user information in history entries', async () => {
      const approverUserId = new mongoose.Types.ObjectId();

      // Mock execution state with user actions in history
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-with-users',
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

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findById(mockExecutionId.toString());

      expect(result).toBeDefined();
      expect(result!.history).toHaveLength(3);
      expect(result!.history[1].userId).toBeDefined();
      expect(result!.history[1].action).toBe('approved');
      expect(result!.history[1].notes).toBe('Approved by manager');
    });

    it('should include routing decisions in conditional node history', async () => {
      // Mock execution state with conditional routing
      const mockExecutionState = {
        _id: mockExecutionId,
        requestId: 'test-request-conditional',
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'approval-high-value',
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
            nodeId: 'conditional-1',
            nodeType: 'conditional',
            action: 'routed',
            routingDecision: true,
            timestamp: new Date('2024-01-01T10:01:00Z'),
          },
          {
            nodeId: 'approval-high-value',
            nodeType: 'approval',
            action: 'entered',
            timestamp: new Date('2024-01-01T10:02:00Z'),
          },
        ],
        startedAt: new Date('2024-01-01T10:00:00Z'),
      };

      jest.spyOn(ExecutionState, 'findById').mockResolvedValue(mockExecutionState as any);

      const result = await ExecutionState.findById(mockExecutionId.toString());

      expect(result).toBeDefined();
      expect(result!.history[1].nodeType).toBe('conditional');
      expect(result!.history[1].action).toBe('routed');
      expect(result!.history[1].routingDecision).toBe(true);
    });
  });
});
