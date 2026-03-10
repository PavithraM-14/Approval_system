/**
 * Tests for RoleManagement component - Role Creation Form
 * 
 * Requirements:
 * - 1.1: Provides role management interface for System Admins
 * - 1.2: Stores role with unique identifier and company association
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleManagement from '@/components/RoleManagement';

// Mock fetch globally
global.fetch = jest.fn();

describe('RoleManagement - Role Creation Form', () => {
  const mockCompanyId = 'company-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for fetching roles
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe('Form Display', () => {
    it('should show Create Role button when form is not visible', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });
    });

    it('should display form when Create Role button is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Role'));

      expect(screen.getByText('Create New Role')).toBeInTheDocument();
      expect(screen.getByLabelText(/Role Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should hide Create Role button when form is visible', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Role')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Role'));

      // The "Create Role" button should be hidden
      const createButtons = screen.queryAllByText('Create Role');
      expect(createButtons).toHaveLength(0);
      
      // But the form should be visible with Submit button
      expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty name', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });

      // Should not call API
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('should trim whitespace from name before validation', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: '   ' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit role with name only', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // Initial fetch
        .mockResolvedValueOnce({ // Create role
          ok: true,
          json: async () => ({
            _id: 'role-1',
            name: 'Finance Manager',
            companyId: mockCompanyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({ // Refresh roles
          ok: true,
          json: async () => [{
            _id: 'role-1',
            name: 'Finance Manager',
            companyId: mockCompanyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: 'Finance Manager',
              description: undefined,
            }),
          })
        );
      });
    });

    it('should submit role with name and description', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            _id: 'role-1',
            name: 'Finance Manager',
            description: 'Approves financial requests',
            companyId: mockCompanyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      const descInput = screen.getByLabelText(/Description/);
      
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });
      fireEvent.change(descInput, { target: { value: 'Approves financial requests' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Finance Manager',
              description: 'Approves financial requests',
            }),
          })
        );
      });
    });

    it('should trim whitespace from inputs before submission', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'role-1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      const descInput = screen.getByLabelText(/Description/);
      
      fireEvent.change(nameInput, { target: { value: '  Finance Manager  ' } });
      fireEvent.change(descInput, { target: { value: '  Approves requests  ' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles',
          expect.objectContaining({
            body: JSON.stringify({
              name: 'Finance Manager',
              description: 'Approves requests',
            }),
          })
        );
      });
    });

    it('should send undefined for empty description', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'role-1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const callArgs = (global.fetch as jest.Mock).mock.calls.find(
          call => call[0] === '/api/roles'
        );
        const body = JSON.parse(callArgs[1].body);
        expect(body.description).toBeUndefined();
      });
    });
  });

  describe('Success Handling', () => {
    it('should reset form after successful creation', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'role-1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Create New Role')).not.toBeInTheDocument();
      });
    });

    it('should refresh role list after successful creation', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'role-1' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            _id: 'role-1',
            name: 'Finance Manager',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/roles/company/${mockCompanyId}`,
          expect.any(Object)
        );
      });

      // Should be called twice: initial load + refresh after create
      const fetchRolesCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[0] === `/api/roles/company/${mockCompanyId}`
      );
      expect(fetchRolesCalls).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Role name already exists' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Role name already exists')).toBeInTheDocument();
      });

      // Form should still be visible
      expect(screen.getByText('Create New Role')).toBeInTheDocument();
    });

    it('should display generic error when API fails without message', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create role')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should hide form when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      expect(screen.getByText('Create New Role')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Create New Role')).not.toBeInTheDocument();
      expect(screen.getByText('Create Role')).toBeInTheDocument();
    });

    it('should reset form data when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Open form again
      fireEvent.click(screen.getByText('Create Role'));

      const newNameInput = screen.getByLabelText(/Role Name/) as HTMLInputElement;
      const newDescInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;

      expect(newNameInput.value).toBe('');
      expect(newDescInput.value).toBe('');
    });

    it('should clear error message when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Open form again
      fireEvent.click(screen.getByText('Create Role'));

      expect(screen.queryByText('Role name is required')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable form inputs while submitting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      // Check disabled state immediately
      expect(nameInput).toBeDisabled();
      expect(screen.getByLabelText(/Description/)).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });

    it('should show "Creating..." text while submitting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Role'));
      });

      const nameInput = screen.getByLabelText(/Role Name/);
      fireEvent.change(nameInput, { target: { value: 'Finance Manager' } });

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
});
