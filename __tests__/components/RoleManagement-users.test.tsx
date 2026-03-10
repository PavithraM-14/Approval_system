/**
 * Tests for RoleManagement Component - User Assignment Interface
 * 
 * Requirements:
 * - 10.1: List users in company and assign users to roles
 * - 10.2: Remove users from roles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from '@/components/RoleManagement';

// Mock fetch
global.fetch = jest.fn();

describe('RoleManagement - User Assignment', () => {
  const mockCompanyId = '507f1f77bcf86cd799439011';
  const mockRoles = [
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Finance Manager',
      description: 'Manages financial approvals',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isInUse: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });
  });

  it('should display "Manage Users" button for each role', async () => {
    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    expect(usersButton).toBeInTheDocument();
  });

  it('should open user management modal when "Manage Users" is clicked', async () => {
    const mockAssignedUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
    ];

    const mockUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
      {
        _id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        empId: 'EMP002',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText(/Manage Users - Finance Manager/i)).toBeInTheDocument();
    });
  });

  it('should display assigned users in the modal', async () => {
    const mockAssignedUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText(/Assigned Users \(1\)/i)).toBeInTheDocument();
  });

  it('should remove user from role when "Remove" button is clicked', async () => {
    let removeCalled = false;

    const mockAssignedUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users/user1') && options?.method === 'DELETE') {
        removeCalled = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'User removed successfully' }),
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => (removeCalled ? [] : mockAssignedUsers),
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(removeCalled).toBe(true);
    });
  });

  it('should close modal when "Close" button is clicked', async () => {
    const mockAssignedUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAssignedUsers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText(/Manage Users - Finance Manager/i)).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Manage Users - Finance Manager/i)).not.toBeInTheDocument();
    });
  });

  it('should display message when no users are assigned', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText(/No users assigned yet/i)).toBeInTheDocument();
    });
  });

  it('should display message when all users are assigned', async () => {
    const mockUsers = [
      {
        _id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        empId: 'EMP001',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/roles/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRoles,
        });
      }
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        });
      }
      if (url.includes('/api/users/company/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<RoleManagement companyId={mockCompanyId} />);

    await waitFor(() => {
      expect(screen.getByText('Finance Manager')).toBeInTheDocument();
    });

    const usersButton = screen.getByRole('button', { name: /users/i });
    fireEvent.click(usersButton);

    await waitFor(() => {
      expect(screen.getByText(/All users are assigned/i)).toBeInTheDocument();
    });
  });
});
