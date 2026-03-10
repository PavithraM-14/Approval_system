import mongoose from 'mongoose';
import { WorkflowExecutionEngine } from '../../lib/workflow-execution-engine';
import WorkflowConfiguration from '../../models/WorkflowConfiguration';
import ExecutionState from '../../models/ExecutionState';

// Mock the models
jest.mock('../../models/WorkflowConfiguration');
jest.mock('../../models/ExecutionState');

describe('WorkflowExecutionEngine', () => {
  let engine: WorkflowExecutionEngine;

  beforeEach(() => {
    engine = new WorkflowExecutionEngine();
    jest.clearAllMocks();
  });

  describe('initializeExecution', () => {
    const validRequestId = 'REQ-12345';
    const validWorkflowId = new mongoose.Types.ObjectId().toString();
    const validCompanyId = new mongoose.Types.ObjectId().toString();

    it('should initialize execution at start node', async () => {
      // Mock workflow with start node
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: validRequestId,
        workflowId: mockWorkflow._id,
        workflowVersion: mockWorkflow.version,
        companyId: mockWorkflow.companyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [
          {
            nodeId: 'start-1',
            nodeType: 'start',
            action: 'entered',
            timestamp: expect.any(Date),
          },
        ],
        startedAt: expect.any(Date),
        save: jest.fn().mockResolvedValue(true),
      };

      (ExecutionState as any).mockImplementation(() => mockExecutionState);

      const result = await engine.initializeExecution(
        validRequestId,
        validWorkflowId,
        validCompanyId
      );

      expect(result).toBeDefined();
      expect(result.requestId).toBe(validRequestId);
      expect(result.currentNodeId).toBe('start-1');
      expect(result.status).toBe('in_progress');
      expect(result.workflowVersion).toBe(1);
      expect(mockExecutionState.save).toHaveBeenCalled();
    });

    it('should throw error if requestId is missing', async () => {
      await expect(
        engine.initializeExecution('', validWorkflowId, validCompanyId)
      ).rejects.toThrow('Missing required parameters');
    });

    it('should throw error if workflowId is missing', async () => {
      await expect(
        engine.initializeExecution(validRequestId, '', validCompanyId)
      ).rejects.toThrow('Missing required parameters');
    });

    it('should throw error if companyId is missing', async () => {
      await expect(
        engine.initializeExecution(validRequestId, validWorkflowId, '')
      ).rejects.toThrow('Missing required parameters');
    });

    it('should throw error if workflowId is invalid', async () => {
      await expect(
        engine.initializeExecution(validRequestId, 'invalid-id', validCompanyId)
      ).rejects.toThrow('Invalid workflowId format');
    });

    it('should throw error if companyId is invalid', async () => {
      await expect(
        engine.initializeExecution(validRequestId, validWorkflowId, 'invalid-id')
      ).rejects.toThrow('Invalid companyId format');
    });

    it('should throw error if workflow not found', async () => {
      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        engine.initializeExecution(validRequestId, validWorkflowId, validCompanyId)
      ).rejects.toThrow(`No active workflow found with ID ${validWorkflowId}`);
    });

    it('should throw error if workflow has no start node', async () => {
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      await expect(
        engine.initializeExecution(validRequestId, validWorkflowId, validCompanyId)
      ).rejects.toThrow(`Workflow ${validWorkflowId} does not have a start node`);
    });

    it('should load active workflow for company', async () => {
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
        name: 'Test Workflow',
        version: 2,
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: validRequestId,
        workflowId: mockWorkflow._id,
        workflowVersion: mockWorkflow.version,
        companyId: mockWorkflow.companyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (ExecutionState as any).mockImplementation(() => mockExecutionState);

      await engine.initializeExecution(validRequestId, validWorkflowId, validCompanyId);

      expect(WorkflowConfiguration.findOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        companyId: expect.any(mongoose.Types.ObjectId),
        isActive: true,
      });
    });

    it('should create ExecutionState with correct workflow version', async () => {
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
        name: 'Test Workflow',
        version: 5,
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: validRequestId,
        workflowId: mockWorkflow._id,
        workflowVersion: mockWorkflow.version,
        companyId: mockWorkflow.companyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (ExecutionState as any).mockImplementation(() => mockExecutionState);

      const result = await engine.initializeExecution(
        validRequestId,
        validWorkflowId,
        validCompanyId
      );

      expect(result.workflowVersion).toBe(5);
    });

    it('should create ExecutionState with empty parallelPaths array', async () => {
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: validRequestId,
        workflowId: mockWorkflow._id,
        workflowVersion: mockWorkflow.version,
        companyId: mockWorkflow.companyId,
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (ExecutionState as any).mockImplementation(() => mockExecutionState);

      const result = await engine.initializeExecution(
        validRequestId,
        validWorkflowId,
        validCompanyId
      );

      expect(result.parallelPaths).toEqual([]);
    });

    it('should add start node entry to history', async () => {
      const mockWorkflow = {
        _id: new mongoose.Types.ObjectId(validWorkflowId),
        companyId: new mongoose.Types.ObjectId(validCompanyId),
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
      };

      (WorkflowConfiguration.findOne as jest.Mock).mockResolvedValue(mockWorkflow);

      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(),
        requestId: validRequestId,
        workflowId: mockWorkflow._id,
        workflowVersion: mockWorkflow.version,
        companyId: mockWorkflow.companyId,
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
        save: jest.fn().mockResolvedValue(true),
      };

      (ExecutionState as any).mockImplementation(() => mockExecutionState);

      const result = await engine.initializeExecution(
        validRequestId,
        validWorkflowId,
        validCompanyId
      );

      expect(result.history).toHaveLength(1);
      expect(result.history[0].nodeId).toBe('start-1');
      expect(result.history[0].nodeType).toBe('start');
      expect(result.history[0].action).toBe('entered');
    });
  });

  describe('getExecutionState', () => {
    it('should retrieve execution state by ID', async () => {
      const executionId = new mongoose.Types.ObjectId().toString();
      const mockExecutionState = {
        _id: new mongoose.Types.ObjectId(executionId),
        requestId: 'REQ-12345',
        workflowId: new mongoose.Types.ObjectId(),
        workflowVersion: 1,
        companyId: new mongoose.Types.ObjectId(),
        currentNodeId: 'start-1',
        status: 'in_progress',
        parallelPaths: [],
        history: [],
        startedAt: new Date(),
      };

      (ExecutionState.findById as jest.Mock).mockResolvedValue(mockExecutionState);

      const result = await engine.getExecutionState(executionId);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(executionId);
      expect(ExecutionState.findById).toHaveBeenCalledWith(executionId);
    });

    it('should throw error if executionId is invalid', async () => {
      await expect(engine.getExecutionState('invalid-id')).rejects.toThrow(
        'Invalid executionId format'
      );
    });

    it('should throw error if execution state not found', async () => {
      const executionId = new mongoose.Types.ObjectId().toString();
      (ExecutionState.findById as jest.Mock).mockResolvedValue(null);

      await expect(engine.getExecutionState(executionId)).rejects.toThrow(
        `Execution state not found with ID ${executionId}`
      );
    });
  });
});
