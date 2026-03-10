import mongoose from 'mongoose';
import { roleService } from '../../lib/role-service';
import CustomRole from '../../models/CustomRole';
import WorkflowConfiguration from '../../models/WorkflowConfiguration';

// Mock the models
jest.mock('../../models/CustomRole');
jest.mock('../../models/WorkflowConfiguration');
jest.mock('../../models/UserRoleAssignment');

describe('RoleService', () => {
  describe('createRole', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a role with valid data', async () => {
      const roleData = {
        name: 'Test Role',
        description: 'Test Description',
      };
      const companyId = new mongoose.Types.ObjectId().toString();

      const mockRole = {
        _id: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(companyId),
        name: roleData.name,
        description: roleData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (CustomRole as any).mockImplementation(() => mockRole);

      const result = await roleService.createRole(roleData, companyId);

      expect(result).toBeDefined();
      expect(result.name).toBe(roleData.name);
      expect(result.description).toBe(roleData.description);
      expect(mockRole.save).toHaveBeenCalled();
    });

    it('should reject duplicate role name within company', async () => {
      const roleData = {
        name: 'Duplicate Role',
        description: 'Test Description',
      };
      const companyId = new mongoose.Types.ObjectId().toString();

      const mockRole = {
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      };

      (CustomRole as any).mockImplementation(() => mockRole);

      await expect(roleService.createRole(roleData, companyId)).rejects.toThrow(
        'Role name "Duplicate Role" already exists for this company'
      );
    });

    it('should reject empty role name', async () => {
      const roleData = {
        name: '',
        description: 'Test Description',
      };
      const companyId = new mongoose.Types.ObjectId().toString();

      await expect(roleService.createRole(roleData, companyId)).rejects.toThrow(
        'Role name is required'
      );
    });

    it('should reject invalid company ID', async () => {
      const roleData = {
        name: 'Test Role',
        description: 'Test Description',
      };
      const companyId = 'invalid-id';

      await expect(roleService.createRole(roleData, companyId)).rejects.toThrow(
        'Valid company ID is required'
      );
    });

    it('should trim role name and description', async () => {
      const roleData = {
        name: '  Test Role  ',
        description: '  Test Description  ',
      };
      const companyId = new mongoose.Types.ObjectId().toString();

      const mockRole = {
        _id: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(companyId),
        name: 'Test Role',
        description: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      (CustomRole as any).mockImplementation(() => mockRole);

      const result = await roleService.createRole(roleData, companyId);

      expect(result.name).toBe('Test Role');
      expect(result.description).toBe('Test Description');
    });
  });
});
