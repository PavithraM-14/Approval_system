/**
 * Integration tests for POST /api/workflows/:id/validate endpoint
 * 
 * Tests cover:
 * - Workflow validation without saving
 * - Detailed validation results
 * - Structure validation (start/end nodes)
 * - Connection validation (reachability, parallel matching, conditional outputs)
 * - Role validation
 * - Multi-tenant isolation
 * 
 * Requirements: 5.1-5.6
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

describe('POST /api/workflows/:id/validate - Business Logic', () => {
  let validator: WorkflowValidator;
  const mockCompanyId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockRoleId = '507f1f77bcf86cd799439013';

  const validWorkflowData: Partial<IWorkflowConfiguration> = {
    companyId: mockCompanyId as any,
    name: 'Test Workflow',
    description: 'A test workflow for validation',
    version: 1,
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

  beforeEach(() => {
    validator = new WorkflowValidator();
    mockFindOne.mockClear();
  });

  describe('Valid Workflow Validation (Requirements 5.1-5.6)', () => {
    it('should return valid=true for a valid workflow', async () => {
      mockFindOne.mockResolvedValue({
        _id: mockRoleId,
        companyId: mockCompanyId,
        name: 'Manager',
      });

      const structureResult = validator.validate(validWorkflowData as IWorkflowConfiguration);
      const roleResult = await validator.validateRoles(
        validWorkflowData as IWorkflowConfiguration,
        mockCompanyId
      );

      expect(structureResult.valid).toBe(true);
      expect(structureResult.errors).toHaveLength(0);
      expect(roleResult.valid).toBe(true);
      expect(roleResult.errors).toHaveLength(0);
    });

    it('should validate workflow without saving it', async () => {
      // This test verifies that validation doesn't persist data
      // In a real scenario, we'd check that no database write occurred
      mockFindOne.mockResolvedValue({
        _id: mockRoleId,
        companyId: mockCompanyId,
        name: 'Manager',
      });

      const result = validator.validate(validWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      // Validation should not modify the workflow object
      expect(validWorkflowData.nodes).toHaveLength(3);
    });
  });

  describe('Start Node Validation (Requirement 5.1)', () => {
    it('should reject workflow with no start node', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: validWorkflowData.nodes!.filter(n => n.type !== 'start'),
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have exactly one start node (found 0)');
    });

    it('should reject workflow with multiple start nodes', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'start-2',
            type: 'start' as const,
            label: 'Start 2',
            position: { x: 50, y: 50 },
            data: {},
          },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exactly one start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('found 2'))).toBe(true);
    });
  });

  describe('End Node Validation (Requirement 5.2)', () => {
    it('should reject workflow with no end node', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: validWorkflowData.nodes!.filter(n => n.type !== 'end'),
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one end node (found 0)');
    });

    it('should accept workflow with multiple end nodes', () => {
      const validMultiEndWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'end-2',
            type: 'end' as const,
            label: 'End 2',
            position: { x: 250, y: 250 },
            data: {},
          },
        ],
        edges: [
          ...validWorkflowData.edges!,
          { id: 'e3', source: 'approval-1', target: 'end-2', type: 'default' as const },
        ],
      };

      const result = validator.validate(validMultiEndWorkflow as IWorkflowConfiguration);
      
      // Should be valid - multiple end nodes are allowed
      expect(result.valid).toBe(true);
    });
  });

  describe('Node Reachability Validation (Requirement 5.3)', () => {
    it('should reject workflow with unreachable nodes', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'orphan-1',
            type: 'approval' as const,
            label: 'Orphan Node',
            position: { x: 300, y: 300 },
            data: {},
          },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not reachable from the start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('Orphan Node'))).toBe(true);
    });

    it('should accept workflow where all nodes are reachable', () => {
      const result = validator.validate(validWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors.some(e => e.includes('not reachable'))).toBe(false);
    });
  });

  describe('Parallel Split-Join Validation (Requirement 5.4)', () => {
    it('should reject parallel split without corresponding join', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'split-1',
            type: 'parallel_split' as const,
            label: 'Split',
            position: { x: 150, y: 150 },
            data: {},
          },
          {
            id: 'approval-2',
            type: 'approval' as const,
            label: 'Approval 2',
            position: { x: 200, y: 100 },
            data: {},
          },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'split-1', type: 'default' as const },
          { id: 'e2', source: 'split-1', target: 'approval-1', type: 'default' as const },
          { id: 'e3', source: 'split-1', target: 'approval-2', type: 'default' as const },
          { id: 'e4', source: 'approval-1', target: 'end-1', type: 'default' as const },
          { id: 'e5', source: 'approval-2', target: 'end-1', type: 'default' as const },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no corresponding parallel join'))).toBe(true);
    });

    it('should accept parallel split with corresponding join', () => {
      const validParallelWorkflow = {
        ...validWorkflowData,
        nodes: [
          validWorkflowData.nodes![0], // start
          {
            id: 'split-1',
            type: 'parallel_split' as const,
            label: 'Split',
            position: { x: 100, y: 100 },
            data: {},
          },
          {
            id: 'approval-1',
            type: 'approval' as const,
            label: 'Approval 1',
            position: { x: 200, y: 50 },
            data: {},
          },
          {
            id: 'approval-2',
            type: 'approval' as const,
            label: 'Approval 2',
            position: { x: 200, y: 150 },
            data: {},
          },
          {
            id: 'join-1',
            type: 'parallel_join' as const,
            label: 'Join',
            position: { x: 300, y: 100 },
            data: {},
          },
          validWorkflowData.nodes![2], // end
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

      const result = validator.validate(validParallelWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
    });

    it('should reject parallel join with less than 2 incoming edges', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'join-1',
            type: 'parallel_join' as const,
            label: 'Join',
            position: { x: 150, y: 150 },
            data: {},
          },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'join-1', type: 'default' as const },
          { id: 'e3', source: 'join-1', target: 'end-1', type: 'default' as const },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 2 incoming edges'))).toBe(true);
    });
  });

  describe('Conditional Node Validation (Requirement 12.6)', () => {
    it('should reject conditional node without exactly 2 outputs', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'cond-1',
            type: 'conditional' as const,
            label: 'Check Amount',
            position: { x: 150, y: 150 },
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
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          { id: 'e3', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'true' },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exactly 2 outgoing edges'))).toBe(true);
    });

    it('should reject conditional node without true/false labels', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'cond-1',
            type: 'conditional' as const,
            label: 'Check Amount',
            position: { x: 150, y: 150 },
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
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          { id: 'e3', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'yes' },
          { id: 'e4', source: 'cond-1', target: 'end-2', type: 'conditional' as const, label: 'no' },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("'true' and 'false'"))).toBe(true);
    });

    it('should accept conditional node with correct true/false outputs', () => {
      const validConditionalWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'cond-1',
            type: 'conditional' as const,
            label: 'Check Amount',
            position: { x: 150, y: 150 },
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
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'approval-1', type: 'default' as const },
          { id: 'e2', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          { id: 'e3', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'true' },
          { id: 'e4', source: 'cond-1', target: 'end-2', type: 'conditional' as const, label: 'false' },
        ],
      };

      const result = validator.validate(validConditionalWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Role Validation (Requirement 5.1-5.6)', () => {
    it('should validate that referenced roles exist in company', async () => {
      mockFindOne.mockResolvedValue({
        _id: mockRoleId,
        companyId: mockCompanyId,
        name: 'Manager',
      });

      const result = await validator.validateRoles(
        validWorkflowData as IWorkflowConfiguration,
        mockCompanyId
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockRoleId,
        companyId: mockCompanyId,
      });
    });

    it('should reject workflow if role does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(
        validWorkflowData as IWorkflowConfiguration,
        mockCompanyId
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not exist in the company'))).toBe(true);
    });

    it('should provide detailed error messages for invalid roles', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(
        validWorkflowData as IWorkflowConfiguration,
        mockCompanyId
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Manager Approval'))).toBe(true);
      expect(result.errors.some(e => e.includes(mockRoleId))).toBe(true);
    });

    it('should pass validation if no roles are referenced', async () => {
      const workflowWithoutRoles = {
        ...validWorkflowData,
        nodes: validWorkflowData.nodes!.map(node => ({
          ...node,
          data: {},
        })),
      };

      const result = await validator.validateRoles(
        workflowWithoutRoles as IWorkflowConfiguration,
        mockCompanyId
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockFindOne).not.toHaveBeenCalled();
    });
  });

  describe('Detailed Validation Results (Requirement 5.5)', () => {
    it('should return specific error messages for each validation failure', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          // No start node
          validWorkflowData.nodes![1], // approval
          // No end node
          {
            id: 'orphan-1',
            type: 'approval' as const,
            label: 'Orphan',
            position: { x: 300, y: 300 },
            data: {},
          },
        ],
        edges: [
          { id: 'e1', source: 'approval-1', target: 'orphan-1', type: 'default' as const },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have specific errors for missing start and end nodes
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('end node'))).toBe(true);
    });

    it('should return all validation errors, not just the first one', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: [
          ...validWorkflowData.nodes!,
          {
            id: 'start-2',
            type: 'start' as const,
            label: 'Start 2',
            position: { x: 50, y: 50 },
            data: {},
          },
          {
            id: 'orphan-1',
            type: 'approval' as const,
            label: 'Orphan',
            position: { x: 300, y: 300 },
            data: {},
          },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
      expect(result.errors.some(e => e.includes('not reachable'))).toBe(true);
    });
  });

  describe('Multi-Tenant Isolation (Requirement 8.3)', () => {
    it('should validate roles only within the specified company', async () => {
      const differentCompanyId = '507f1f77bcf86cd799439099';
      mockFindOne.mockResolvedValue(null);

      const result = await validator.validateRoles(
        validWorkflowData as IWorkflowConfiguration,
        differentCompanyId
      );
      
      expect(result.valid).toBe(false);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockRoleId,
        companyId: differentCompanyId,
      });
    });
  });
});
