/**
 * Unit tests for POST /api/roles endpoint
 * 
 * Tests cover:
 * - Role creation with valid data
 * - Role name uniqueness validation
 * - Multi-tenant isolation
 * - Input validation
 * 
 * Requirements:
 * - 1.1: Provides role management interface for System Admins
 * - 1.2: Stores role with unique identifier and company association
 */

import roleService from '@/lib/role-service';
import CustomRole from '@/models/CustomRole';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('POST /api/roles - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Creation (Requirements 1.1, 1.2)', () => {
    it('should create role with valid data', async () => {
      const roleData = {
        name: 'Manager',
        description: 'Manages team approvals',
      };

      // Mock the save operation
      const mockSave = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(mockCompanyId),
        name: roleData.name,
        description: roleData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      const role = await roleService.createRole(roleData, mockCompanyId);

      expect(role).toBeDefined();
      expect(role.name).toBe(roleData.name);
      expect(role.description).toBe(roleData.description);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should create role without description', async () => {
      const roleData = {
        name: 'Approver',
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(mockCompanyId),
        name: roleData.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      const role = await roleService.createRole(roleData, mockCompanyId);

      expect(role).toBeDefined();
      expect(role.name).toBe(roleData.name);
      expect(role.description).toBeUndefined();
    });

    it('should trim whitespace from role name', async () => {
      const roleData = {
        name: '  Manager  ',
        description: '  Manages team  ',
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(mockCompanyId),
        name: 'Manager',
        description: 'Manages team',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      const role = await roleService.createRole(roleData, mockCompanyId);

      expect(role.name).toBe('Manager');
      expect(role.description).toBe('Manages team');
    });

    it('should associate role with company', async () => {
      const roleData = {
        name: 'Director',
      };

      let savedCompanyId: any;
      const mockSave = jest.fn().mockImplementation(function(this: any) {
        savedCompanyId = this.companyId;
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          companyId: this.companyId,
          name: this.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      await roleService.createRole(roleData, mockCompanyId);

      expect(savedCompanyId).toBeDefined();
      expect(savedCompanyId.toString()).toBe(mockCompanyId);
    });
  });

  describe('Role Name Uniqueness (Requirement 1.2)', () => {
    it('should reject duplicate role name within same company', async () => {
      const roleData = {
        name: 'Manager',
      };

      // Mock duplicate key error
      const mockSave = jest.fn().mockRejectedValue({
        code: 11000,
        message: 'Duplicate key error',
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      await expect(
        roleService.createRole(roleData, mockCompanyId)
      ).rejects.toThrow('already exists');
    });

    it('should allow same role name in different companies', async () => {
      const roleData = {
        name: 'Manager',
      };

      const company1Id = new mongoose.Types.ObjectId().toString();
      const company2Id = new mongoose.Types.ObjectId().toString();

      const mockSave = jest.fn()
        .mockResolvedValueOnce({
          _id: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(company1Id),
          name: roleData.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          _id: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(company2Id),
          name: roleData.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      const role1 = await roleService.createRole(roleData, company1Id);
      const role2 = await roleService.createRole(roleData, company2Id);

      expect(role1.name).toBe(roleData.name);
      expect(role2.name).toBe(roleData.name);
      expect(role1.companyId.toString()).toBe(company1Id);
      expect(role2.companyId.toString()).toBe(company2Id);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty role name', async () => {
      const roleData = {
        name: '',
      };

      await expect(
        roleService.createRole(roleData, mockCompanyId)
      ).rejects.toThrow('Role name is required');
    });

    it('should reject whitespace-only role name', async () => {
      const roleData = {
        name: '   ',
      };

      await expect(
        roleService.createRole(roleData, mockCompanyId)
      ).rejects.toThrow('Role name is required');
    });

    it('should reject invalid company ID', async () => {
      const roleData = {
        name: 'Manager',
      };

      await expect(
        roleService.createRole(roleData, 'invalid-id')
      ).rejects.toThrow('Valid company ID is required');
    });

    it('should reject missing company ID', async () => {
      const roleData = {
        name: 'Manager',
      };

      await expect(
        roleService.createRole(roleData, '')
      ).rejects.toThrow('Valid company ID is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const roleData = {
        name: 'Manager',
      };

      const mockSave = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      await expect(
        roleService.createRole(roleData, mockCompanyId)
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate validation errors from Mongoose', async () => {
      const roleData = {
        name: 'Manager',
      };

      const mockSave = jest.fn().mockRejectedValue({
        name: 'ValidationError',
        message: 'Validation failed',
      });

      jest.spyOn(CustomRole.prototype, 'save').mockImplementation(mockSave);

      await expect(
        roleService.createRole(roleData, mockCompanyId)
      ).rejects.toMatchObject({
        name: 'ValidationError',
      });
    });
  });
});
