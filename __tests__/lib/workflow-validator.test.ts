import { WorkflowValidator } from '../../lib/workflow-validator';
import { IWorkflowConfiguration, IWorkflowNode } from '../../models/WorkflowConfiguration';

// Mock CustomRole module for validateRoles tests
const mockFindOne = jest.fn();
jest.mock('../../models/CustomRole', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
  },
}));

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;

  beforeEach(() => {
    validator = new WorkflowValidator();
    mockFindOne.mockClear();
  });

  describe('validateStructure', () => {
    const createMockWorkflow = (nodes: IWorkflowNode[]): Partial<IWorkflowConfiguration> => {
      return {
        _id: 'mock-id' as any,
        companyId: 'mock-company-id' as any,
        name: 'Test Workflow',
        version: 1,
        isActive: false,
        nodes,
        edges: [],
        createdBy: 'mock-user-id' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    it('should validate workflow with exactly one start node and one end node', () => {
      const workflow = createMockWorkflow([
        {
          id: 'start-1',
          type: 'start',
          label: 'Start',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow with zero start nodes', () => {
      const workflow = createMockWorkflow([
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have exactly one start node (found 0)');
    });

    it('should reject workflow with multiple start nodes', () => {
      const workflow = createMockWorkflow([
        {
          id: 'start-1',
          type: 'start',
          label: 'Start 1',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'start-2',
          type: 'start',
          label: 'Start 2',
          position: { x: 0, y: 50 },
          data: {},
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have exactly one start node (found 2)');
    });

    it('should reject workflow with zero end nodes', () => {
      const workflow = createMockWorkflow([
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
          label: 'Approval',
          position: { x: 50, y: 50 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one end node (found 0)');
    });

    it('should accept workflow with multiple end nodes', () => {
      const workflow = createMockWorkflow([
        {
          id: 'start-1',
          type: 'start',
          label: 'Start',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End 1',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'end-2',
          type: 'end',
          label: 'End 2',
          position: { x: 100, y: 150 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report multiple errors when both start and end node requirements are violated', () => {
      const workflow = createMockWorkflow([
        {
          id: 'approval-1',
          type: 'approval',
          label: 'Approval',
          position: { x: 50, y: 50 },
          data: {},
        },
      ]);

      const result = validator.validateStructure(workflow as IWorkflowConfiguration);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Workflow must have exactly one start node (found 0)');
      expect(result.errors).toContain('Workflow must have at least one end node (found 0)');
    });
  });

  describe('validate (main method)', () => {
    const createMockWorkflow = (
      nodes: IWorkflowNode[],
      edges: any[] = []
    ): IWorkflowConfiguration => {
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
      } as IWorkflowConfiguration;
    };

    it('should validate a complete valid workflow', () => {
      const workflow = createMockWorkflow(
        [
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
            position: { x: 100, y: 0 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'approval-1' },
          { id: 'e2', source: 'approval-1', target: 'end-1' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should combine structure and connection validation errors', () => {
      // Workflow with no start node, no end node, and unreachable node
      const workflow = createMockWorkflow(
        [
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Approval 1',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'approval-2',
            type: 'approval',
            label: 'Approval 2',
            position: { x: 100, y: 0 },
            data: {},
          },
        ],
        []
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have structure errors (no start, no end)
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('end node'))).toBe(true);
    });

    it('should fail validation when structure is invalid', () => {
      // Multiple start nodes
      const workflow = createMockWorkflow(
        [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start 1',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'start-2',
            type: 'start',
            label: 'Start 2',
            position: { x: 0, y: 50 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'end-1' },
          { id: 'e2', source: 'start-2', target: 'end-1' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have exactly one start node (found 2)');
    });

    it('should fail validation when connections are invalid', () => {
      // Unreachable node
      const workflow = createMockWorkflow(
        [
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
            label: 'Connected Approval',
            position: { x: 100, y: 0 },
            data: {},
          },
          {
            id: 'approval-2',
            type: 'approval',
            label: 'Unreachable Approval',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'approval-1' },
          { id: 'e2', source: 'approval-1', target: 'end-1' },
          // approval-2 is not connected
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unreachable Approval'))).toBe(true);
      expect(result.errors.some(e => e.includes('not reachable'))).toBe(true);
    });

    it('should validate workflow with conditional nodes', () => {
      const workflow = createMockWorkflow(
        [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'cond-1',
            type: 'conditional',
            label: 'Check Amount',
            position: { x: 100, y: 0 },
            data: {
              condition: {
                field: 'amount',
                operator: 'gt' as const,
                value: 1000,
              },
            },
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End 1',
            position: { x: 200, y: -50 },
            data: {},
          },
          {
            id: 'end-2',
            type: 'end',
            label: 'End 2',
            position: { x: 200, y: 50 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'cond-1' },
          { id: 'e2', source: 'cond-1', target: 'end-1', label: 'true' },
          { id: 'e3', source: 'cond-1', target: 'end-2', label: 'false' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for conditional node with invalid outputs', () => {
      const workflow = createMockWorkflow(
        [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'cond-1',
            type: 'conditional',
            label: 'Check Amount',
            position: { x: 100, y: 0 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'cond-1' },
          { id: 'e2', source: 'cond-1', target: 'end-1', label: 'true' },
          // Missing false edge
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must have exactly 2 outgoing edges'))).toBe(true);
    });

    it('should validate workflow with parallel split and join', () => {
      const workflow = createMockWorkflow(
        [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'split-1',
            type: 'parallel_split',
            label: 'Split',
            position: { x: 100, y: 0 },
            data: {},
          },
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Approval 1',
            position: { x: 200, y: -50 },
            data: {},
          },
          {
            id: 'approval-2',
            type: 'approval',
            label: 'Approval 2',
            position: { x: 200, y: 50 },
            data: {},
          },
          {
            id: 'join-1',
            type: 'parallel_join',
            label: 'Join',
            position: { x: 300, y: 0 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End',
            position: { x: 400, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'split-1' },
          { id: 'e2', source: 'split-1', target: 'approval-1' },
          { id: 'e3', source: 'split-1', target: 'approval-2' },
          { id: 'e4', source: 'approval-1', target: 'join-1' },
          { id: 'e5', source: 'approval-2', target: 'join-1' },
          { id: 'e6', source: 'join-1', target: 'end-1' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for parallel split without matching join', () => {
      const workflow = createMockWorkflow(
        [
          {
            id: 'start-1',
            type: 'start',
            label: 'Start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'split-1',
            type: 'parallel_split',
            label: 'Split',
            position: { x: 100, y: 0 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            label: 'End 1',
            position: { x: 200, y: -50 },
            data: {},
          },
          {
            id: 'end-2',
            type: 'end',
            label: 'End 2',
            position: { x: 200, y: 50 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'start-1', target: 'split-1' },
          { id: 'e2', source: 'split-1', target: 'end-1' },
          { id: 'e3', source: 'split-1', target: 'end-2' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no corresponding parallel join'))).toBe(true);
    });

    it('should return comprehensive error list when multiple validations fail', () => {
      // Workflow with multiple issues:
      // - No start node
      // - No end node
      // - Conditional node with wrong number of outputs
      const workflow = createMockWorkflow(
        [
          {
            id: 'cond-1',
            type: 'conditional',
            label: 'Condition',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'approval-1',
            type: 'approval',
            label: 'Approval',
            position: { x: 100, y: 0 },
            data: {},
          },
        ],
        [
          { id: 'e1', source: 'cond-1', target: 'approval-1' },
        ]
      );

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      // Should have structure errors
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('end node'))).toBe(true);
      // Connection validation returns early without start node, so conditional error won't appear
    });
  });

  describe('validateRoles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const createMockWorkflow = (nodes: IWorkflowNode[]): Partial<IWorkflowConfiguration> => {
      return {
        _id: 'mock-id' as any,
        companyId: 'company-123' as any,
        name: 'Test Workflow',
        version: 1,
        isActive: false,
        nodes,
        edges: [],
        createdBy: 'mock-user-id' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    it('should validate workflow with no approval nodes', async () => {
      const workflow = createMockWorkflow([
        {
          id: 'start-1',
          type: 'start',
          label: 'Start',
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate workflow with approval nodes that have no roleId', async () => {
      const workflow = createMockWorkflow([
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
          label: 'Approval',
          position: { x: 50, y: 50 },
          data: {},
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate workflow when all referenced roles exist in company', async () => {
      const roleId1 = 'role-123' as any;
      const roleId2 = 'role-456' as any;

      const workflow = createMockWorkflow([
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
          position: { x: 50, y: 50 },
          data: { roleId: roleId1 },
        },
        {
          id: 'approval-2',
          type: 'approval',
          label: 'Director Approval',
          position: { x: 75, y: 75 },
          data: { roleId: roleId2 },
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      // Mock CustomRole.findOne to return valid roles
      mockFindOne
        .mockResolvedValueOnce({ _id: roleId1, companyId: 'company-123', name: 'Manager' })
        .mockResolvedValueOnce({ _id: roleId2, companyId: 'company-123', name: 'Director' });

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockFindOne).toHaveBeenCalledTimes(2);
    });

    it('should reject workflow when referenced role does not exist', async () => {
      const roleId = 'nonexistent-role' as any;

      const workflow = createMockWorkflow([
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
          position: { x: 50, y: 50 },
          data: { roleId },
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      // Mock CustomRole.findOne to return null (role not found)
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Manager Approval');
      expect(result.errors[0]).toContain('nonexistent-role');
      expect(result.errors[0]).toContain('does not exist in the company');
    });

    it('should reject workflow when role belongs to different company', async () => {
      const roleId = 'role-123' as any;

      const workflow = createMockWorkflow([
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
          position: { x: 50, y: 50 },
          data: { roleId },
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      // Mock CustomRole.findOne to return null (role not found for this company)
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: roleId,
        companyId: 'company-123',
      });
    });

    it('should handle multiple nodes referencing the same invalid role', async () => {
      const roleId = 'invalid-role' as any;

      const workflow = createMockWorkflow([
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
          label: 'First Approval',
          position: { x: 50, y: 50 },
          data: { roleId },
        },
        {
          id: 'approval-2',
          type: 'approval',
          label: 'Second Approval',
          position: { x: 75, y: 75 },
          data: { roleId },
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      // Mock CustomRole.findOne to return null
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('First Approval');
      expect(result.errors[1]).toContain('Second Approval');
      // Should only query once for the unique roleId
      expect(mockFindOne).toHaveBeenCalledTimes(1);
    });

    it('should handle mix of valid and invalid roles', async () => {
      const validRoleId = 'valid-role' as any;
      const invalidRoleId = 'invalid-role' as any;

      const workflow = createMockWorkflow([
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
          label: 'Valid Approval',
          position: { x: 50, y: 50 },
          data: { roleId: validRoleId },
        },
        {
          id: 'approval-2',
          type: 'approval',
          label: 'Invalid Approval',
          position: { x: 75, y: 75 },
          data: { roleId: invalidRoleId },
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'End',
          position: { x: 100, y: 100 },
          data: {},
        },
      ]);

      // Mock CustomRole.findOne - one role will be invalid
      // Note: Set iteration order may vary, so we mock both scenarios
      mockFindOne
        .mockImplementation(async ({ _id }: any) => {
          if (_id === invalidRoleId) {
            return null; // invalid role
          }
          return { _id: validRoleId, companyId: 'company-123', name: 'Manager' }; // valid role
        });

      const result = await validator.validateRoles(workflow as IWorkflowConfiguration, 'company-123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid Approval');
      expect(result.errors[0]).toContain('invalid-role');
    });
  });
});
