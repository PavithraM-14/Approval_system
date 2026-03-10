/**
 * Unit tests for POST /api/executions endpoint
 * 
 * Tests cover:
 * - Execution initialization with active workflow
 * - Workflow selection (provided vs. active)
 * - Multi-tenant isolation
 * - Input validation
 * 
 * Requirements:
 * - 6.1: Retrieve active workflow configuration for request's company
 * - 6.2: Initialize request at workflow start node
 * - 9.3: Use latest active workflow version for new executions
 */

import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import ExecutionState from '@/models/ExecutionState';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/executions - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId();
  const mockWorkflowId = new mongoose.Types.ObjectId();
  const mockRequestId = 'test-request-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Execution Initialization (Requirements 6.1, 6.2)', () => {
    it('should initialize execution at start node', async () => {
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
            data: { roleId: new mongoose.Types.ObjectId() },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'approval-1',
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      };

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);

      const mockSave = jest.fn().mockImplementation(function(this: any) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          requestId: this.requestId,
          workflowId: this.workflowId,
          workflowVersion: this.workflowVersion,
          companyId: this.companyId,
          currentNodeId: this.currentNodeId,
          status: this.status,
          parallelPaths: this.parallelPaths,
          history: this.history,
          startedAt: this.startedAt,
        });
      });

      jest.spyOn(ExecutionState.prototype, 'save').mockImplementation(mockSave);

      const executionState = await workflowExecutionEngine.initializeExecution(
        mockRequestId,
        mockWorkflowId.toString(),
        mockCompanyId.toString()
      );

      expect(executionState).toBeDefined();
      expect(executionState.requestId).toBe(mockRequestId);
      expect(executionState.currentNodeId).toBe('start-1');
      expect(executionState.status).toBe('in_progress');
      expect(executionState.history).toHaveLength(1);
      expect(executionState.history[0].nodeId).toBe('start-1');
      expect(executionState.history[0].action).toBe('entered');
    });

    it('should use active workflow version (Requirement 9.3)', async () => {
      const mockWorkflow = {
        _id: mockWorkflowId,
        companyId: mockCompanyId,
        name: 'Test Workflow',
        version: 3,
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

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);

      let savedWorkflowVersion: number | undefined;
      const mockSave = jest.fn().mockImplementation(function(this: any) {
        savedWorkflowVersion = this.workflowVersion;
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          requestId: this.requestId,
          workflowId: this.workflowId,
          workflowVersion: this.workflowVersion,
          companyId: this.companyId,
          currentNodeId: this.currentNodeId,
          status: this.status,
          parallelPaths: this.parallelPaths,
          history: this.history,
          startedAt: this.startedAt,
        });
      });

      jest.spyOn(ExecutionState.prototype, 'save').mockImplementation(mockSave);

      await workflowExecutionEngine.initializeExecution(
        mockRequestId,
        mockWorkflowId.toString(),
        mockCompanyId.toString()
      );

      expect(savedWorkflowVersion).toBe(3);
    });

    it('should associate execution with correct company', async () => {
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

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);

      let savedCompanyId: any;
      const mockSave = jest.fn().mockImplementation(function(this: any) {
        savedCompanyId = this.companyId;
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          requestId: this.requestId,
          workflowId: this.workflowId,
          workflowVersion: this.workflowVersion,
          companyId: this.companyId,
          currentNodeId: this.currentNodeId,
          status: this.status,
          parallelPaths: this.parallelPaths,
          history: this.history,
          startedAt: this.startedAt,
        });
      });

      jest.spyOn(ExecutionState.prototype, 'save').mockImplementation(mockSave);

      await workflowExecutionEngine.initializeExecution(
        mockRequestId,
        mockWorkflowId.toString(),
        mockCompanyId.toString()
      );

      expect(savedCompanyId).toBeDefined();
      expect(savedCompanyId.toString()).toBe(mockCompanyId.toString());
    });
  });

  describe('Input Validation', () => {
    it('should reject missing requestId', async () => {
      await expect(
        workflowExecutionEngine.initializeExecution(
          '',
          mockWorkflowId.toString(),
          mockCompanyId.toString()
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject missing workflowId', async () => {
      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          '',
          mockCompanyId.toString()
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject missing companyId', async () => {
      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          ''
        )
      ).rejects.toThrow('Missing required parameters');
    });

    it('should reject invalid workflowId format', async () => {
      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          'invalid-id',
          mockCompanyId.toString()
        )
      ).rejects.toThrow('Invalid workflowId format');
    });

    it('should reject invalid companyId format', async () => {
      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          'invalid-id'
        )
      ).rejects.toThrow('Invalid companyId format');
    });
  });

  describe('Workflow Validation', () => {
    it('should reject workflow not found', async () => {
      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(null);

      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          mockCompanyId.toString()
        )
      ).rejects.toThrow('No active workflow found');
    });

    it('should reject workflow without start node', async () => {
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
            data: { roleId: new mongoose.Types.ObjectId() },
          },
        ],
        edges: [],
        createdBy: new mongoose.Types.ObjectId(),
      };

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);

      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          mockCompanyId.toString()
        )
      ).rejects.toThrow('does not have a start node');
    });

    it('should only use active workflow (Requirement 6.1)', async () => {
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

      const findOneSpy = jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);

      const mockSave = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        requestId: mockRequestId,
        workflowId: mockWorkflowId,
        workflowVersion: 1,
        companyId: mockCompanyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      });

      jest.spyOn(ExecutionState.prototype, 'save').mockImplementation(mockSave);

      await workflowExecutionEngine.initializeExecution(
        mockRequestId,
        mockWorkflowId.toString(),
        mockCompanyId.toString()
      );

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(WorkflowConfiguration, 'findOne').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          mockCompanyId.toString()
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle save errors', async () => {
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

      jest.spyOn(WorkflowConfiguration, 'findOne').mockResolvedValue(mockWorkflow as any);
      jest.spyOn(ExecutionState.prototype, 'save').mockRejectedValue(
        new Error('Failed to save execution state')
      );

      await expect(
        workflowExecutionEngine.initializeExecution(
          mockRequestId,
          mockWorkflowId.toString(),
          mockCompanyId.toString()
        )
      ).rejects.toThrow('Failed to save execution state');
    });
  });
});
