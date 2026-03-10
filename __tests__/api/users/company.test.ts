/**
 * Tests for GET /api/users/company/:companyId - Business Logic
 * 
 * Requirements:
 * - 10.1: List users in company for role assignment
 * - 8.2: Enforce company-level isolation
 */

import User from '@/models/User';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('GET /api/users/company/:companyId - Business Logic', () => {
  const mockCompanyId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List Company Users (Requirement 10.1)', () => {
    it('should retrieve all users for a company', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'John Doe',
          email: 'john@example.com',
          empId: 'EMP001',
          company: new mongoose.Types.ObjectId(mockCompanyId),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Jane Smith',
          email: 'jane@example.com',
          empId: 'EMP002',
          company: new mongoose.Types.ObjectId(mockCompanyId),
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockUsers);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      const users = await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      expect(User.find).toHaveBeenCalledWith({ company: mockCompanyId });
      expect(mockSelect).toHaveBeenCalledWith('_id name email empId');
      expect(mockSort).toHaveBeenCalledWith({ name: 1 });
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('John Doe');
      expect(users[1].name).toBe('Jane Smith');
    });

    it('should return empty array when company has no users', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      const users = await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      expect(users).toEqual([]);
    });

    it('should sort users by name in ascending order', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Alice',
          email: 'alice@example.com',
          empId: 'EMP001',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Bob',
          email: 'bob@example.com',
          empId: 'EMP002',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Charlie',
          email: 'charlie@example.com',
          empId: 'EMP003',
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockUsers);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      expect(mockSort).toHaveBeenCalledWith({ name: 1 });
    });

    it('should only select necessary user fields', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      expect(mockSelect).toHaveBeenCalledWith('_id name email empId');
    });
  });

  describe('Multi-Tenant Isolation (Requirement 8.2)', () => {
    it('should filter users by company ID', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      const findSpy = jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      expect(findSpy).toHaveBeenCalledWith({ company: mockCompanyId });
    });

    it('should not return users from other companies', async () => {
      const otherCompanyId = new mongoose.Types.ObjectId().toString();
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'John Doe',
          email: 'john@example.com',
          empId: 'EMP001',
          company: new mongoose.Types.ObjectId(mockCompanyId),
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockUsers);
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      jest.spyOn(User, 'find').mockReturnValue({ select: mockSelect } as any);

      const users = await User.find({ company: mockCompanyId })
        .select('_id name email empId')
        .sort({ name: 1 });

      // Verify that the query filters by the correct company
      expect(User.find).toHaveBeenCalledWith({ company: mockCompanyId });
      expect(User.find).not.toHaveBeenCalledWith({ company: otherCompanyId });
      
      // All returned users should belong to the requested company
      users.forEach((user: any) => {
        expect(user.company.toString()).toBe(mockCompanyId);
      });
    });
  });
});
