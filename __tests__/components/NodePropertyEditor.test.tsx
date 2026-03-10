import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NodePropertyEditor from '@/components/NodePropertyEditor';
import { Node } from '@xyflow/react';

// Mock fetch
global.fetch = jest.fn();

describe('NodePropertyEditor Component', () => {
  const mockCompanyId = 'company-123';
  const mockOnUpdateNode = jest.fn();
  const mockOnDeleteNode = jest.fn();

  const mockRoles = [
    { _id: 'role-1', name: 'Manager', description: 'Manager role' },
    { _id: 'role-2', name: 'Director', description: 'Director role' },
    { _id: 'role-3', name: 'VP', description: 'VP role' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRoles,
    });
  });

  describe('No Node Selected', () => {
    it('displays message when no node is selected', () => {
      render(
        <NodePropertyEditor
          selectedNode={null}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByText('Select a node to edit its properties')).toBeInTheDocument();
    });

    it('does not display any input fields when no node is selected', () => {
      render(
        <NodePropertyEditor
          selectedNode={null}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.queryByLabelText('Label')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    });
  });

  describe('Common Properties (All Node Types)', () => {
    const startNode: Node = {
      id: 'start-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start Node', description: 'Entry point' },
    };

    it('displays node type label', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByText('Start Node')).toBeInTheDocument();
    });

    it('displays label input field with current value', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const labelInput = screen.getByLabelText('Label') as HTMLInputElement;
      expect(labelInput).toBeInTheDocument();
      expect(labelInput.value).toBe('Start Node');
    });

    it('displays description textarea with current value', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      expect(descriptionInput).toBeInTheDocument();
      expect(descriptionInput.value).toBe('Entry point');
    });

    it('allows editing label', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const labelInput = screen.getByLabelText('Label') as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: 'New Label' } });
      expect(labelInput.value).toBe('New Label');
    });

    it('allows editing description', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
      expect(descriptionInput.value).toBe('New Description');
    });

    it('displays update button', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByRole('button', { name: /update properties/i })).toBeInTheDocument();
    });

    it('calls onUpdateNode with updated data when update button is clicked', () => {
      render(
        <NodePropertyEditor
          selectedNode={startNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const labelInput = screen.getByLabelText('Label');
      const descriptionInput = screen.getByLabelText('Description');
      const updateButton = screen.getByRole('button', { name: /update properties/i });

      fireEvent.change(labelInput, { target: { value: 'Updated Label' } });
      fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });
      fireEvent.click(updateButton);

      expect(mockOnUpdateNode).toHaveBeenCalledWith('start-1', {
        label: 'Updated Label',
        description: 'Updated Description',
      });
    });
  });

  describe('Approval Node Properties', () => {
    const approvalNode: Node = {
      id: 'approval-1',
      type: 'approval',
      position: { x: 100, y: 100 },
      data: { label: 'Approval', roleId: 'role-1', roleName: 'Manager' },
    };

    it('fetches roles on mount', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/roles/company/${mockCompanyId}`);
      });
    });

    it('displays role selector for approval nodes', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Required Role')).toBeInTheDocument();
      });
    });

    it('displays loading state while fetching roles', () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByText('Loading roles...')).toBeInTheDocument();
    });

    it('populates role selector with fetched roles', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Required Role') as HTMLSelectElement;
        expect(roleSelect.options.length).toBe(4); // 1 default + 3 roles
        expect(roleSelect.options[1].text).toBe('Manager');
        expect(roleSelect.options[2].text).toBe('Director');
        expect(roleSelect.options[3].text).toBe('VP');
      });
    });

    it('pre-selects current role', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Required Role') as HTMLSelectElement;
        expect(roleSelect.value).toBe('role-1');
      });
    });

    it('allows changing role selection', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Required Role') as HTMLSelectElement;
        fireEvent.change(roleSelect, { target: { value: 'role-2' } });
        expect(roleSelect.value).toBe('role-2');
      });
    });

    it('includes role data when updating approval node', async () => {
      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        const roleSelect = screen.getByLabelText('Required Role');
        fireEvent.change(roleSelect, { target: { value: 'role-2' } });
      });

      const updateButton = screen.getByRole('button', { name: /update properties/i });
      fireEvent.click(updateButton);

      expect(mockOnUpdateNode).toHaveBeenCalledWith('approval-1', {
        label: 'Approval',
        description: '',
        roleId: 'role-2',
        roleName: 'Director',
      });
    });

    it('displays message when no roles are available', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No roles available. Create roles first.')).toBeInTheDocument();
      });
    });

    it('handles fetch error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch roles:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Conditional Node Properties', () => {
    const conditionalNode: Node = {
      id: 'conditional-1',
      type: 'conditional',
      position: { x: 200, y: 200 },
      data: {
        label: 'Condition',
        condition: {
          field: 'costEstimate',
          operator: 'gt' as const,
          value: '1000',
        },
      },
    };

    it('displays condition editor for conditional nodes', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByLabelText('Field')).toBeInTheDocument();
      expect(screen.getByLabelText('Operator')).toBeInTheDocument();
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    it('pre-fills condition fields with current values', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const fieldInput = screen.getByLabelText('Field') as HTMLInputElement;
      const operatorSelect = screen.getByLabelText('Operator') as HTMLSelectElement;
      const valueInput = screen.getByLabelText('Value') as HTMLInputElement;

      expect(fieldInput.value).toBe('costEstimate');
      expect(operatorSelect.value).toBe('gt');
      expect(valueInput.value).toBe('1000');
    });

    it('allows editing condition field', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const fieldInput = screen.getByLabelText('Field') as HTMLInputElement;
      fireEvent.change(fieldInput, { target: { value: 'expenseCategory' } });
      expect(fieldInput.value).toBe('expenseCategory');
    });

    it('allows changing condition operator', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const operatorSelect = screen.getByLabelText('Operator') as HTMLSelectElement;
      fireEvent.change(operatorSelect, { target: { value: 'lte' } });
      expect(operatorSelect.value).toBe('lte');
    });

    it('allows editing condition value', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const valueInput = screen.getByLabelText('Value') as HTMLInputElement;
      fireEvent.change(valueInput, { target: { value: '5000' } });
      expect(valueInput.value).toBe('5000');
    });

    it('displays all operator options', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const operatorSelect = screen.getByLabelText('Operator') as HTMLSelectElement;
      const options = Array.from(operatorSelect.options).map(opt => opt.value);

      expect(options).toEqual(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains']);
    });

    it('includes condition data when updating conditional node', () => {
      render(
        <NodePropertyEditor
          selectedNode={conditionalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const fieldInput = screen.getByLabelText('Field');
      const operatorSelect = screen.getByLabelText('Operator');
      const valueInput = screen.getByLabelText('Value');
      const updateButton = screen.getByRole('button', { name: /update properties/i });

      fireEvent.change(fieldInput, { target: { value: 'amount' } });
      fireEvent.change(operatorSelect, { target: { value: 'gte' } });
      fireEvent.change(valueInput, { target: { value: '2000' } });
      fireEvent.click(updateButton);

      expect(mockOnUpdateNode).toHaveBeenCalledWith('conditional-1', {
        label: 'Condition',
        description: '',
        condition: {
          field: 'amount',
          operator: 'gte',
          value: '2000',
        },
      });
    });

    it('initializes empty condition for conditional node without condition data', () => {
      const nodeWithoutCondition: Node = {
        id: 'conditional-2',
        type: 'conditional',
        position: { x: 200, y: 200 },
        data: { label: 'New Condition' },
      };

      render(
        <NodePropertyEditor
          selectedNode={nodeWithoutCondition}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const fieldInput = screen.getByLabelText('Field') as HTMLInputElement;
      const operatorSelect = screen.getByLabelText('Operator') as HTMLSelectElement;
      const valueInput = screen.getByLabelText('Value') as HTMLInputElement;

      expect(fieldInput.value).toBe('');
      expect(operatorSelect.value).toBe('eq');
      expect(valueInput.value).toBe('');
    });
  });

  describe('Node Type Specific Behavior', () => {
    it('does not display role selector for non-approval nodes', () => {
      const endNode: Node = {
        id: 'end-1',
        type: 'end',
        position: { x: 300, y: 300 },
        data: { label: 'End' },
      };

      render(
        <NodePropertyEditor
          selectedNode={endNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.queryByLabelText('Required Role')).not.toBeInTheDocument();
    });

    it('does not display condition editor for non-conditional nodes', () => {
      const approvalNode: Node = {
        id: 'approval-1',
        type: 'approval',
        position: { x: 100, y: 100 },
        data: { label: 'Approval' },
      };

      render(
        <NodePropertyEditor
          selectedNode={approvalNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.queryByLabelText('Field')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Operator/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
    });

    it('displays correct node type label for each node type', () => {
      const nodeTypes = [
        { type: 'start', label: 'Start Node' },
        { type: 'end', label: 'End Node' },
        { type: 'approval', label: 'Approval Node' },
        { type: 'parallel_split', label: 'Parallel Split Node' },
        { type: 'parallel_join', label: 'Parallel Join Node' },
        { type: 'conditional', label: 'Conditional Node' },
      ];

      nodeTypes.forEach(({ type, label }) => {
        const node: Node = {
          id: `${type}-1`,
          type,
          position: { x: 0, y: 0 },
          data: { label: 'Test' },
        };

        const { unmount } = render(
          <NodePropertyEditor
            selectedNode={node}
            companyId={mockCompanyId}
            onUpdateNode={mockOnUpdateNode}
            onDeleteNode={mockOnDeleteNode}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('State Management', () => {
    it('updates local state when selected node changes', () => {
      const node1: Node = {
        id: 'node-1',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Node 1', description: 'First node' },
      };

      const node2: Node = {
        id: 'node-2',
        type: 'end',
        position: { x: 100, y: 100 },
        data: { label: 'Node 2', description: 'Second node' },
      };

      const { rerender } = render(
        <NodePropertyEditor
          selectedNode={node1}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe('Node 1');
      expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('First node');

      rerender(
        <NodePropertyEditor
          selectedNode={node2}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe('Node 2');
      expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('Second node');
    });

    it('preserves existing node data when updating', () => {
      const nodeWithExtraData: Node = {
        id: 'node-1',
        type: 'approval',
        position: { x: 0, y: 0 },
        data: {
          label: 'Approval',
          description: 'Test',
          roleId: 'role-1',
          roleName: 'Manager',
          customField: 'custom value',
        },
      };

      render(
        <NodePropertyEditor
          selectedNode={nodeWithExtraData}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const updateButton = screen.getByRole('button', { name: /update properties/i });
      fireEvent.click(updateButton);

      expect(mockOnUpdateNode).toHaveBeenCalledWith('node-1', expect.objectContaining({
        customField: 'custom value',
      }));
    });
  });

  describe('Node Deletion', () => {
    const testNode: Node = {
      id: 'test-node-1',
      type: 'approval',
      position: { x: 100, y: 100 },
      data: { label: 'Test Node' },
    };

    beforeEach(() => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);
    });

    it('displays delete button when node is selected', () => {
      render(
        <NodePropertyEditor
          selectedNode={testNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.getByRole('button', { name: /delete node/i })).toBeInTheDocument();
    });

    it('does not display delete button when no node is selected', () => {
      render(
        <NodePropertyEditor
          selectedNode={null}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      expect(screen.queryByRole('button', { name: /delete node/i })).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when delete button is clicked', () => {
      render(
        <NodePropertyEditor
          selectedNode={testNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete node/i });
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this Approval Node?');
    });

    it('calls onDeleteNode when deletion is confirmed', () => {
      global.confirm = jest.fn(() => true);

      render(
        <NodePropertyEditor
          selectedNode={testNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete node/i });
      fireEvent.click(deleteButton);

      expect(mockOnDeleteNode).toHaveBeenCalledWith('test-node-1');
    });

    it('does not call onDeleteNode when deletion is cancelled', () => {
      global.confirm = jest.fn(() => false);

      render(
        <NodePropertyEditor
          selectedNode={testNode}
          companyId={mockCompanyId}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDeleteNode}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete node/i });
      fireEvent.click(deleteButton);

      expect(mockOnDeleteNode).not.toHaveBeenCalled();
    });

    it('shows correct node type in confirmation dialog for different node types', () => {
      const nodeTypes = [
        { type: 'start', label: 'Start Node' },
        { type: 'end', label: 'End Node' },
        { type: 'approval', label: 'Approval Node' },
        { type: 'parallel_split', label: 'Parallel Split Node' },
        { type: 'parallel_join', label: 'Parallel Join Node' },
        { type: 'conditional', label: 'Conditional Node' },
      ];

      nodeTypes.forEach(({ type, label }) => {
        const node: Node = {
          id: `${type}-1`,
          type,
          position: { x: 0, y: 0 },
          data: { label: 'Test' },
        };

        const { unmount } = render(
          <NodePropertyEditor
            selectedNode={node}
            companyId={mockCompanyId}
            onUpdateNode={mockOnUpdateNode}
            onDeleteNode={mockOnDeleteNode}
          />
        );

        const deleteButton = screen.getByRole('button', { name: /delete node/i });
        fireEvent.click(deleteButton);

        expect(global.confirm).toHaveBeenCalledWith(`Are you sure you want to delete this ${label}?`);
        
        unmount();
        jest.clearAllMocks();
      });
    });
  });
});
