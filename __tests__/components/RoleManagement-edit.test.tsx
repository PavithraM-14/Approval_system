/**
 * Tests for RoleManagement component - Role Edit Functionality
 * 
 * Requirements:
 * - 1.3: Update role name and trigger workflow reference updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleManagement from '@/components/RoleManagement';

// Mock fetch globally
global.fetch = jest.fn();

describe('RoleManagement - Role Edit Functionality', () => {
  const mockCompanyId = 'company-123';
  const mockRoles = [
    {
      _id: 'role-1',
      name: 'Finance Manager',
      description: 'Approves financial requests',
      companyId: mockCompanyId,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      _id: 'role-2',
      name: 'Department Head',
      description: 'Department level approvals',
      companyId: mockCompanyId,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for fetching roles
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRoles,
    });
  });

  describe('Edit Button Display', () => {
    it('should display Edit button for each role in the table', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      expect(editButtons).toHaveLength(2);
    });

    it('should have Actions column header in the table', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Form Display', () => {
    it('should show edit form when Edit button is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Role')).toBeInTheDocument();
      expect(screen.getByLabelText(/Role Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should pre-fill form with role data', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Finance Manager');
      expect(descInput.value).toBe('Approves financial requests');
    });

    it('should pre-fill form with empty description if role has no description', async () => {
      const rolesWithoutDesc = [
        {
          ...mockRoles[0],
          description: undefined,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => rolesWithoutDesc,
      });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      expect(descInput.value).toBe('');
    });

    it('should hide Create Role button when edit form is visible', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.queryByText('Create Role')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty name', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: '' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });

      // Should not call API (only initial fetch)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from name before validation', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: '   ' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call PUT endpoint with updated data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles }) // Initial fetch
        .mockResolvedValueOnce({ // Update role
          ok: true,
          json: async () => ({
            ...mockRoles[0],
            name: 'Senior Finance Manager',
            description: 'Updated description',
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles }); // Refresh

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      const descInput = screen.getByLabelText(/Description/);
      
      fireEvent.change(nameInput, { target: { value: 'Senior Finance Manager' } });
      fireEvent.change(descInput, { target: { value: 'Updated description' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles/role-1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: 'Senior Finance Manager',
              description: 'Updated description',
            }),
          })
        );
      });
    });

    it('should update only name if description unchanged', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Senior Finance Manager' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles/role-1',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Senior Finance Manager',
              description: 'Approves financial requests',
            }),
          })
        );
      });
    });

    it('should trim whitespace from inputs before submission', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      const descInput = screen.getByLabelText(/Description/);
      
      fireEvent.change(nameInput, { target: { value: '  Senior Finance Manager  ' } });
      fireEvent.change(descInput, { target: { value: '  Updated description  ' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles/role-1',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Senior Finance Manager',
              description: 'Updated description',
            }),
          })
        );
      });
    });

    it('should send undefined for empty description', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const descInput = screen.getByLabelText(/Description/);
      fireEvent.change(descInput, { target: { value: '' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        const callArgs = (global.fetch as jest.Mock).mock.calls.find(
          call => call[0] === '/api/roles/role-1'
        );
        const body = JSON.parse(callArgs[1].body);
        expect(body.description).toBeUndefined();
      });
    });
  });

  describe('Success Handling', () => {
    it('should hide edit form after successful update', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Role')).not.toBeInTheDocument();
      });
    });

    it('should refresh role list after successful update', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/roles/company/${mockCompanyId}`,
          expect.any(Object)
        );
      });

      // Should be called twice: initial load + refresh after update
      const fetchRolesCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[0] === `/api/roles/company/${mockCompanyId}`
      );
      expect(fetchRolesCalls).toHaveLength(2);
    });

    it('should show Create Role button again after successful update', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.queryByText('Create Role')).not.toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Role name already exists' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Department Head' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role name already exists')).toBeInTheDocument();
      });

      // Form should still be visible
      expect(screen.getByText('Edit Role')).toBeInTheDocument();
    });

    it('should display generic error when API fails without message', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update role')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should hide edit form when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Role')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Edit Role')).not.toBeInTheDocument();
      expect(screen.getByText('Create Role')).toBeInTheDocument();
    });

    it('should reset form data when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Open edit form again
      const newEditButtons = screen.getAllByText('Edit');
      fireEvent.click(newEditButtons[0]);

      const newNameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      expect(newNameInput.value).toBe('Finance Manager'); // Original value
    });

    it('should clear error message when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Trigger validation error
      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: '' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Open edit form again
      const newEditButtons = screen.getAllByText('Edit');
      fireEvent.click(newEditButtons[0]);

      expect(screen.queryByText('Role name is required')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable form inputs while submitting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      // Check disabled state immediately
      expect(nameInput).toBeDisabled();
      expect(screen.getByLabelText(/Description/)).toBeDisabled();
      expect(updateButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });

    it('should show "Updating..." text while submitting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const updateButton = screen.getByRole('button', { name: /Update/i });
      fireEvent.click(updateButton);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Multiple Role Editing', () => {
    it('should allow editing different roles sequentially', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      // Edit first role
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      let nameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      expect(nameInput.value).toBe('Finance Manager');

      // Cancel and edit second role
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      const newEditButtons = screen.getAllByText('Edit');
      fireEvent.click(newEditButtons[1]);

      nameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      expect(nameInput.value).toBe('Department Head');
    });
  });

  describe('Form Isolation', () => {
    it('should not show create form when edit form is visible', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Role')).toBeInTheDocument();
      expect(screen.queryByText('Create New Role')).not.toBeInTheDocument();
    });

    it('should close edit form when opening create form', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      // Open edit form
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      expect(screen.getByText('Edit Role')).toBeInTheDocument();

      // Cancel edit and open create form
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      const createButton = screen.getByText('Create Role');
      fireEvent.click(createButton);

      expect(screen.getByText('Create New Role')).toBeInTheDocument();
      expect(screen.queryByText('Edit Role')).not.toBeInTheDocument();
    });
  });
});
