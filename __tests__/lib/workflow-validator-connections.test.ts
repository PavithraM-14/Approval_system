import { WorkflowValidator } from '../../lib/workflow-validator';
import { IWorkflowConfiguration, IWorkflowNode, IWorkflowEdge } from '../../models/WorkflowConfiguration';

describe('WorkflowValidator - validateConnections', () => {
  let validator: WorkflowValidator;

  beforeEach(() => {
    validator = new WorkflowValidator();
  });

  const createMockWorkflow = (
    nodes: IWorkflowNode[],
    edges: IWorkflowEdge[]
  ): Partial<IWorkflowConfiguration> => {
    return {
      _id: 'mock-id' as any,
      companyId: 'mock-company-id' as any,
      name: 'Test Workflow',
      version: 1,
      isActive: false,
      nodes,
      edges,
      createdBy: 'mock-user-id' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  describe('Node Reachability (Requirement 5.3)', () => {
    it('should validate when all nodes are reachable from start', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'approval', type: 'approval', label: 'Approval', position: { x: 100, y: 0 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'approval' },
          { id: 'e2', source: 'approval', target: 'end' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unreachable nodes', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'approval1', type: 'approval', label: 'Approval 1', position: { x: 100, y: 0 }, data: {} },
          { id: 'approval2', type: 'approval', label: 'Approval 2', position: { x: 100, y: 100 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'approval1' },
          { id: 'e2', source: 'approval1', target: 'end' },
          // approval2 is not connected
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Node 'Approval 2' (approval2) is not reachable from the start node");
    });
  });

  describe('Conditional Node Outputs (Requirement 12.6)', () => {
    it('should validate conditional node with true and false edges', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'cond', type: 'conditional', label: 'Condition', position: { x: 100, y: 0 }, data: {} },
          { id: 'end1', type: 'end', label: 'End 1', position: { x: 200, y: 0 }, data: {} },
          { id: 'end2', type: 'end', label: 'End 2', position: { x: 200, y: 100 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'end1', label: 'true' },
          { id: 'e3', source: 'cond', target: 'end2', label: 'false' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject conditional node with wrong number of edges', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'cond', type: 'conditional', label: 'Condition', position: { x: 100, y: 0 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'end', label: 'true' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Conditional node 'Condition' (cond) must have exactly 2 outgoing edges (found 1)");
    });

    it('should reject conditional node with incorrect edge labels', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'cond', type: 'conditional', label: 'Condition', position: { x: 100, y: 0 }, data: {} },
          { id: 'end1', type: 'end', label: 'End 1', position: { x: 200, y: 0 }, data: {} },
          { id: 'end2', type: 'end', label: 'End 2', position: { x: 200, y: 100 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'end1', label: 'yes' },
          { id: 'e3', source: 'cond', target: 'end2', label: 'no' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("must have edges labeled 'true' and 'false'"))).toBe(true);
    });
  });

  describe('Parallel Split-Join Matching (Requirement 5.4)', () => {
    it('should validate matching parallel split and join', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'split', type: 'parallel_split', label: 'Split', position: { x: 100, y: 0 }, data: {} },
          { id: 'approval1', type: 'approval', label: 'Approval 1', position: { x: 200, y: -50 }, data: {} },
          { id: 'approval2', type: 'approval', label: 'Approval 2', position: { x: 200, y: 50 }, data: {} },
          { id: 'join', type: 'parallel_join', label: 'Join', position: { x: 300, y: 0 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 400, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'split' },
          { id: 'e2', source: 'split', target: 'approval1' },
          { id: 'e3', source: 'split', target: 'approval2' },
          { id: 'e4', source: 'approval1', target: 'join' },
          { id: 'e5', source: 'approval2', target: 'join' },
          { id: 'e6', source: 'join', target: 'end' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parallel split with less than 2 outgoing paths', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'split', type: 'parallel_split', label: 'Split', position: { x: 100, y: 0 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'split' },
          { id: 'e2', source: 'split', target: 'end' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Parallel split node 'Split' (split) must have at least 2 outgoing paths (found 1)");
    });

    it('should reject parallel split without corresponding join', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'split', type: 'parallel_split', label: 'Split', position: { x: 100, y: 0 }, data: {} },
          { id: 'end1', type: 'end', label: 'End 1', position: { x: 200, y: -50 }, data: {} },
          { id: 'end2', type: 'end', label: 'End 2', position: { x: 200, y: 50 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'split' },
          { id: 'e2', source: 'split', target: 'end1' },
          { id: 'e3', source: 'split', target: 'end2' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Parallel split node 'Split' (split) has no corresponding parallel join node");
    });

    it('should reject parallel join with less than 2 incoming edges', () => {
      const workflow = createMockWorkflow(
        [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, data: {} },
          { id: 'join', type: 'parallel_join', label: 'Join', position: { x: 100, y: 0 }, data: {} },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, data: {} },
        ],
        [
          { id: 'e1', source: 'start', target: 'join' },
          { id: 'e2', source: 'join', target: 'end' },
        ]
      );

      const result = validator.validateConnections(workflow as IWorkflowConfiguration);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Parallel join node 'Join' (join) must have at least 2 incoming edges (found 1)");
    });
  });
});
