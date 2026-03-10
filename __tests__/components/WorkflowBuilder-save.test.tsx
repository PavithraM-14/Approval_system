/**
 * Unit tests for WorkflowBuilder save functionality
 * 
 * Tests cover:
 * - Workflow name validation
 * - Validation API call before save
 * - Success and error message display
 * - Save button state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import { Node, Edge } from '@xyflow/react';

// Mock React Flow
let mockNodes: Node[] = [];
let mockSetNodes: jest.Mock;
let mockOnNodesChange: jest.Mock;

jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => (
    <div data-testid="react-flow-canvas">{children}</div>
  ),
  MiniMap: () => <div data-testid="react-flow-minimap">MiniMap</div>,
  Controls: () => <div data-testid="react-flow-controls">Controls</div>,
  Background: () => <div data-testid="react-flow-background">Background</div>,
  BackgroundVariant: { Dots: 'dots' },
  useNodesState: () => {
    mockSetNodes = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockNodes = updater(mockNodes);
      } else {
        mockNodes = updater;
      }
    });
    mockOnNodesChange = jest.fn();
    return [mockNodes, mockSetNodes, mockOnNodesChange];
  },
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
}));

// Mock NodePropertyEditor
jest.mock('@/components/NodePropertyEditor', () => {
  return function MockNodePropertyEditor() {
    return <div data-testid="node-property-editor">Property Editor</div>;
  };
});

// Mock workflow-nodes
jest.mock('@/components/workflow-nodes', () => ({
  nodeTypes: {},
}));

// Mock fetch
global.fetch = jest.fn();

describe('WorkflowBuilder Save Functionality', () => {
  const mockProps = {
    companyId: 'test-company-123',
  };

  // Helper to create mock nodes
  const createMockNodes = (): Node[] => [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockNodes = [];
  });

  it('displays validation error when workflow has no nodes', async () => {
    const mockSave = jest.fn();
    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow must have at least one node')).toBeInTheDocument();
    });

    expect(mockSave).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls validation API before saving', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn().mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/workflows/new/validate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  it('displays validation errors from API', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        valid: false,
        errors: ['Workflow must have exactly one start node', 'Workflow must have at least one end node'],
      }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow must have exactly one start node')).toBeInTheDocument();
      expect(screen.getByText('Workflow must have at least one end node')).toBeInTheDocument();
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('calls onSave when validation passes', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn().mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const descriptionInput = screen.getByLabelText('Description (optional)');
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        name: 'Test Workflow',
        description: 'Test Description',
        nodes: mockNodes,
        edges: [],
      });
    });
  });

  it('displays success message after successful save', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn().mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow saved successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message when save fails', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn().mockRejectedValue(new Error('Network error'));
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables save button while saving', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('clears previous validation errors on new save attempt', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn();
    
    // First attempt - validation fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        valid: false,
        errors: ['Workflow must have exactly one start node'],
      }),
    });

    render(<WorkflowBuilder {...mockProps} onSave={mockSave} workflowName="Test Workflow" />);

    const nameInput = screen.getByLabelText('Workflow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Workflow must have exactly one start node')).toBeInTheDocument();
    });

    // Second attempt - validation passes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });
    mockSave.mockResolvedValue(undefined);

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Workflow must have exactly one start node')).not.toBeInTheDocument();
    });
  });

  it('includes workflowId in validation URL when editing', async () => {
    mockNodes = createMockNodes();
    const mockSave = jest.fn().mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ valid: true, errors: [] }),
    });

    render(
      <WorkflowBuilder
        {...mockProps}
        workflowId="workflow-123"
        workflowName="Test Workflow"
        onSave={mockSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/workflows/workflow-123/validate',
        expect.any(Object)
      );
    });
  });
});
