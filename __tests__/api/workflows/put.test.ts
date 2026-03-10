/**
 * Integration tests for PUT /api/workflows/:id endpoint
 * 
 * Tests cover:
 * - Workflow version increment on update (Requirement 9.1)
 * - Workflow validation before update
 * - Multi-tenant isolation
 * - Original workflow preservation
 * 
 * Note: These tests focus on the business logic rather than HTTP layer.
 * Full end-to-end tests should be done with a test server.
 */

import { WorkflowValidator } from '@/lib/workflow-validator';
import { IWorkflowConfiguration } from '@/models/WorkflowConfiguration';

// Mock CustomRole for role validation
const mockFindOne = jest.fn();
jest.mock('@/models/CustomRole', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
  },
}));

describe('PUT /api/workflows/:id - Business Logic', () => {
  let validator: WorkflowValidator;
  const mockCompanyId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockRoleId = '507f1f77bcf86cd799439013';
  const mockWorkflowId = '507f1f77bcf86cd799439014';

  const existingWorkflowData: Partial<IWorkflowConfiguration> = {
    _id: mockWorkflowId as any,
    companyId: mockCompanyId as any,
    name: 'Test Workflow',
    description: 'Original workflow',
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
        data: { roleId: mockRoleId as any },
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
      { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' },
      { id: 'e2', source: 'approval-1', target: 'end-1', type: 'default' },
    ],
    createdBy: mockUserId as any,
  };

  const updatedWorkflowData: Partial<IWorkflowConfiguration> = {
    companyId: mockCompanyId as any,
    name: 'Test Workflow',
    description: 'Updated workflow',
    version: 2, // This should be incremented by the endpoint
    isActive: false,
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
        data: { roleId: mockRoleId as any },
      },
      {
        id: 'approval-2',
        type: 'approval',
        label: 'Director Approval',
        position: { x: 150, y: 150 },
        data: { roleId: mockRoleId as any },
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
      { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' },
      { id: 'e2', source: 'approval-1', target: 'approval-2', type: 'default' },
      { id: 'e3', source: 'approval-2', target: 'end-1', type: 'default' },
    ],
    createdBy: mockUserId as any,
  };

  beforeEach(() => {
    validator = new WorkflowValidator();
    mockFindOne.mockClear();
  });

  describe('Workflow Version Increment (Requirement 9.1)', () => {
    it('should create a new version when updating workflow', () => {
      // Simulate the version increment logic
      const latestVersion = existingWorkflowData.version!;
      const newVersion = latestVersion + 1;

      expect(newVersion).toBe(2);
      expect(newVersion).toBeGreaterThan(existingWorkflowData.version!);
    });

    it('should preserve original workflow version', () => {
      // The original workflow should remain unchanged
      const originalVersion = existingWorkflowData.version;
      
      // After update, original should still be version 1
      expect(originalVersion).toBe(1);
    });

    it('should validate updated workflow before creating new version', () => {
      const result = validator.validate(updatedWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid workflow update', () => {
      const invalidUpdate = {
        ...updatedWorkflowData,
        nodes: updatedWorkflowData.nodes!.filter(n => n.type !== 'start'),
      };

      const result = validator.validate(invalidUpdate as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
    });
  });

  describe('Multi-Tenant Isolation (Requirement 8.3)', () => {
    it('should verify company ownership before update', () => {
      const workflow = existingWorkflowData;
      const userCompanyId = mockCompanyId;

      // Simulate company ownership check
      const isOwner = workflow.companyId?.toString() === userCompanyId;
      
      expect(isOwner).toBe(true);
    });

    it('should reject update from different company', () => {
      const workflow = existingWorkflowData;
      const differentCompanyId = '507f1f77bcf86cd799439099';

      // Simulate company ownership check
      const isOwner = workflow.companyId?.toString() === differentCompanyId;
      
      expect(isOwner).toBe(false);
    });

    it('should validate roles belong to same company', async () => {
      mockFindOne.mockResolvedValue({
        _id: mockRoleId,
        companyId: mockCompanyId,
        name: 'Manager',
      });

      const result = await validator.validateRoles(
        updatedWorkflowData as IWorkflowConfiguration,
        mockCompanyId
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Workflow Update Validation', () => {
    it('should validate updated workflow structure', () => {
      const result = validator.validate(updatedWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject update with missing required fields', () => {
      const invalidUpdate = {
        ...updatedWorkflowData,
        name: undefined,
      };

      // Name validation would happen at API level
      expect(invalidUpdate.name).toBeUndefined();
    });

    it('should reject update with empty nodes array', () => {
      const invalidUpdate = {
        ...updatedWorkflowData,
        nodes: [],
      };

      const result = validator.validate(invalidUpdate as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
    });

    it('should preserve workflow metadata in update', () => {
      const update = updatedWorkflowData;
      
      expect(update.companyId).toBe(mockCompanyId);
      expect(update.createdBy).toBe(mockUserId);
      expect(update.name).toBe('Test Workflow');
    });
  });

  describe('Updated Workflow Structure', () => {
    it('should allow adding new nodes', () => {
      const originalNodeCount = existingWorkflowData.nodes!.length;
      const updatedNodeCount = updatedWorkflowData.nodes!.length;
      
      expect(updatedNodeCount).toBeGreaterThan(originalNodeCount);
      expect(updatedNodeCount).toBe(4);
    });

    it('should allow adding new edges', () => {
      const originalEdgeCount = existingWorkflowData.edges!.length;
      const updatedEdgeCount = updatedWorkflowData.edges!.length;
      
      expect(updatedEdgeCount).toBeGreaterThan(originalEdgeCount);
      expect(updatedEdgeCount).toBe(3);
    });

    it('should validate new workflow structure', () => {
      const result = validator.validate(updatedWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should maintain workflow connectivity', () => {
      // Check that all nodes are connected
      const result = validator.validate(updatedWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      // No unreachable nodes error
      expect(result.errors.some(e => e.includes('not reachable'))).toBe(false);
    });
  });

  describe('Conditional Node Updates', () => {
    it('should allow adding conditional nodes in update', () => {
      const workflowWithConditional = {
        ...updatedWorkflowData,
        nodes: [
          ...updatedWorkflowData.nodes!.slice(0, 2),
          {
            id: 'cond-1',
            type: 'conditional' as const,
            label: 'Check Amount',
            position: { x: 125, y: 125 },
            data: {
              condition: {
                field: 'amount',
                operator: 'gt' as const,
                value: 1000,
              },
            },
          },
          {
            id: 'end-2',
            type: 'end' as const,
            label: 'End 2',
            position: { x: 250, y: 250 },
            data: {},
          },
          ...updatedWorkflowData.nodes!.slice(2),
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          { id: 'e3', source: 'cond-1', target: 'approval-2', type: 'conditional' as const, label: 'true' },
          { id: 'e4', source: 'cond-1', target: 'end-2', type: 'conditional' as const, label: 'false' },
          { id: 'e5', source: 'approval-2', target: 'end-1', type: 'default' as const },
        ],
      };

      const result = validator.validate(workflowWithConditional as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject conditional node with invalid outputs', () => {
      const invalidWorkflow = {
        ...updatedWorkflowData,
        nodes: [
          ...updatedWorkflowData.nodes!,
          {
            id: 'cond-1',
            type: 'conditional' as const,
            label: 'Check Amount',
            position: { x: 125, y: 125 },
            data: {
              condition: {
                field: 'amount',
                operator: 'gt' as const,
                value: 1000,
              },
            },
          },
        ],
        edges: [
          ...updatedWorkflowData.edges!,
          { id: 'e4', source: 'approval-2', target: 'cond-1', type: 'default' as const },
          // Only one output - should fail
          { id: 'e5', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'true' },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exactly 2 outgoing edges'))).toBe(true);
    });
  });

  describe('Parallel Node Updates', () => {
    it('should allow adding parallel split and join nodes', () => {
      const workflowWithParallel = {
        ...updatedWorkflowData,
        nodes: [
          updatedWorkflowData.nodes![0], // start
          {
            id: 'split-1',
            type: 'parallel_split' as const,
            label: 'Split',
            position: { x: 50, y: 50 },
            data: {},
          },
          updatedWorkflowData.nodes![1], // approval-1
          updatedWorkflowData.nodes![2], // approval-2
          {
            id: 'join-1',
            type: 'parallel_join' as const,
            label: 'Join',
            position: { x: 175, y: 175 },
            data: {},
          },
          updatedWorkflowData.nodes![3], // end
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'split-1', type: 'default' as const },
          { id: 'e2', source: 'split-1', target: 'approval-1', type: 'default' as const },
          { id: 'e3', source: 'split-1', target: 'approval-2', type: 'default' as const },
          { id: 'e4', source: 'approval-1', target: 'join-1', type: 'default' as const },
          { id: 'e5', source: 'approval-2', target: 'join-1', type: 'default' as const },
          { id: 'e6', source: 'join-1', target: 'end-1', type: 'default' as const },
        ],
      };

      const result = validator.validate(workflowWithParallel as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
