/**
 * Tests for RoleManagement component - Role Deletion with Protection
 * 
 * Requirements:
 * - 1.4: Prevent deletion if role is used in any active workflow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleManagement from '@/components/RoleManagement';

// Mock fetch globally
global.fetch = jest.fn();

describe('RoleManagement - Role Deletion with Protection', () => {
  const mockCompanyId = 'company-123';
  const mockRoles = [
    {
      _id: 'role-1',
      name: 'Finance Manager',
      description: 'Approves financial requests',
      companyId: mockCompanyId,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isInUse: false,
    },
    {
      _id: 'role-2',
      name: 'Department Head',
      description: 'Department level approvals',
      companyId: mockCompanyId,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      isInUse: true,
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

  // Helper function to get the confirm button in the dialog
  const getDialogConfirmButton = () => {
    const dialog = screen.getByText('Delete Role').closest('div')?.parentElement;
    if (!dialog) throw new Error('Dialog not found');
    return within(dialog).getByRole('button', { name: /^Delete$/i });
  };

  describe('Delete Button Display', () => {
    it('should display Delete button for each role in the table', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2);
    });

    it('should display Delete button with trash icon', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete role');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Confirmation Dialog', () => {
    it('should show confirmation dialog when Delete button is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Role')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete the role "Finance Manager"/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should show warning message for roles in use', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Department Head')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]); // Click on Department Head (isInUse: true)

      expect(screen.getByText(/Warning: This role is currently in use in workflows and cannot be deleted/)).toBeInTheDocument();
    });

    it('should not show warning message for roles not in use', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]); // Click on Finance Manager (isInUse: false)

      expect(screen.queryByText(/Warning: This role is currently in use/)).not.toBeInTheDocument();
    });

    it('should close dialog when Cancel is clicked', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Role')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Delete Role')).not.toBeInTheDocument();
    });
  });

  describe('Successful Deletion', () => {
    it('should call DELETE endpoint when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles }) // Initial fetch
        .mockResolvedValueOnce({ // Delete role
          ok: true,
          json: async () => ({
            message: 'Role deleted successfully',
            roleId: 'role-1',
          }),
        })
        .mockResolvedValueOnce({ // Refresh roles
          ok: true,
          json: async () => [mockRoles[1]],
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/roles/role-1',
          expect.objectContaining({
            method: 'DELETE',
            credentials: 'include',
          })
        );
      });
    });

    it('should close dialog after successful deletion', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Role deleted successfully' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [mockRoles[1]] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Role')).not.toBeInTheDocument();
      });
    });

    it('should refresh role list after successful deletion', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Role deleted successfully' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => [mockRoles[1]] });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/roles/company/${mockCompanyId}`,
          expect.any(Object)
        );
      });

      // Should be called twice: initial load + refresh after delete
      const fetchRolesCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[0] === `/api/roles/company/${mockCompanyId}`
      );
      expect(fetchRolesCalls).toHaveLength(2);
    });
  });

  describe('Deletion Protection - Role In Use', () => {
    it('should show error when trying to delete role in use', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Cannot delete role that is in use',
            details: 'Role is used in active workflows',
          }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Department Head')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]); // Department Head (isInUse: true)

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Cannot delete role that is in use');
      });

      alertMock.mockRestore();
    });

    it('should keep dialog open when deletion fails', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Cannot delete role that is in use' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });

      // Dialog should still be visible
      expect(screen.getByText('Delete Role')).toBeInTheDocument();

      alertMock.mockRestore();
    });

    it('should not refresh role list when deletion fails', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Cannot delete role that is in use' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });

      // Should only be called once: initial load (no refresh)
      const fetchRolesCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[0] === `/api/roles/company/${mockCompanyId}`
      );
      expect(fetchRolesCalls).toHaveLength(1);

      alertMock.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Network error' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Network error');
      });

      alertMock.mockRestore();
    });

    it('should display generic error when API fails without message', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

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

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Failed to delete role');
      });

      alertMock.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should disable buttons while deleting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      // Check disabled state immediately
      expect(confirmButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });

    it('should show "Deleting..." text while deleting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      const confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Multiple Role Deletion', () => {
    it('should allow deleting different roles sequentially', async () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockRoles }) // Initial fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Role deleted' }) }) // Delete first
        .mockResolvedValueOnce({ ok: true, json: async () => [mockRoles[1]] }) // Refresh
        .mockResolvedValueOnce({ // Try to delete second (in use)
          ok: false,
          json: async () => ({ error: 'Cannot delete role that is in use' }),
        });

      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      // Delete first role (not in use)
      let deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      let confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Role')).not.toBeInTheDocument();
      });

      // Try to delete second role (in use)
      await waitFor(() => {
        expect(screen.getByText('Department Head')).toBeInTheDocument();
      });

      deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]); // Now only one role left

      await waitFor(() => {
        expect(screen.getByText('Delete Role')).toBeInTheDocument();
      });

      confirmButton = getDialogConfirmButton();
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Cannot delete role that is in use');
      });

      alertMock.mockRestore();
    });
  });

  describe('Dialog Overlay', () => {
    it('should render dialog with overlay background', async () => {
      render(<RoleManagement companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Finance Manager')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Check for overlay (fixed inset-0 with bg-black bg-opacity-50)
      // The dialog structure is: fixed overlay > white box > h3 "Delete Role"
      const dialogHeading = screen.getByText('Delete Role');
      const whiteBox = dialogHeading.parentElement; // The white dialog box
      const overlay = whiteBox?.parentElement; // The fixed overlay
      
      expect(overlay).toHaveClass('fixed', 'inset-0');
    });
  });
});
