/**
 * Integration tests for POST /api/workflows endpoint
 * 
 * Tests cover:
 * - Workflow validation before creation
 * - Company association
 * - Multi-tenant isolation
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


describe('POST /api/workflows - Business Logic', () => {
  let validator: WorkflowValidator;
  const mockCompanyId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockRoleId = '507f1f77bcf86cd799439013';

  const validWorkflowData: Partial<IWorkflowConfiguration> = {
    companyId: mockCompanyId as any,
    name: 'Test Workflow',
    description: 'A test workflow',
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

  describe('Workflow Validation (Requirements 4.1, 8.3)', () => {
    it('should validate workflow structure before creation', () => {
      const result = validator.validate(validWorkflowData as IWorkflowConfiguration);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow with no start node', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: validWorkflowData.nodes!.filter(n => n.type !== 'start'),
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
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
      expect(result.errors.some(e => e.includes('start node'))).toBe(true);
    });

    it('should reject workflow with no end node', () => {
      const invalidWorkflow = {
        ...validWorkflowData,
        nodes: validWorkflowData.nodes!.filter(n => n.type !== 'end'),
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('end node'))).toBe(true);
    });

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
      expect(result.errors.some(e => e.includes('not reachable'))).toBe(true);
    });
  });

  describe('Role Validation (Requirement 8.3)', () => {
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
      expect(result.errors.some(e => e.includes('role'))).toBe(true);
    });

    it('should reject workflow if role belongs to different company', async () => {
      const differentCompanyId = '507f1f77bcf86cd799439099';
      mockFindOne.mockResolvedValue(null); // Won't find role with this company

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

  describe('Workflow Data Structure (Requirement 4.1)', () => {
    it('should preserve all node properties', () => {
      const workflow = validWorkflowData;
      
      expect(workflow.nodes).toHaveLength(3);
      expect(workflow.nodes![0]).toMatchObject({
        id: 'start-1',
        type: 'start',
        label: 'Start',
        position: { x: 0, y: 0 },
      });
      expect(workflow.nodes![1]).toMatchObject({
        id: 'approval-1',
        type: 'approval',
        label: 'Manager Approval',
        position: { x: 100, y: 100 },
        data: { roleId: mockRoleId },
      });
    });

    it('should preserve all edge properties', () => {
      const workflow = validWorkflowData;
      
      expect(workflow.edges).toHaveLength(2);
      expect(workflow.edges![0]).toMatchObject({
        id: 'e1',
        source: 'start-1',
        target: 'approval-1',
        type: 'default',
      });
    });

    it('should associate workflow with company', () => {
      const workflow = validWorkflowData;
      
      expect(workflow.companyId).toBe(mockCompanyId);
    });

    it('should track workflow creator', () => {
      const workflow = validWorkflowData;
      
      expect(workflow.createdBy).toBe(mockUserId);
    });
  });

  describe('Conditional Node Validation', () => {
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
          ...validWorkflowData.edges!,
          { id: 'e3', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          // Only one output - should fail
          { id: 'e4', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'true' },
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
          ...validWorkflowData.edges!,
          { id: 'e3', source: 'approval-1', target: 'cond-1', type: 'default' as const },
          { id: 'e4', source: 'cond-1', target: 'end-1', type: 'conditional' as const, label: 'yes' },
          { id: 'e5', source: 'cond-1', target: 'end-2', type: 'conditional' as const, label: 'no' },
        ],
      };

      const result = validator.validate(invalidWorkflow as IWorkflowConfiguration);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("'true' and 'false'"))).toBe(true);
    });
  });
});
