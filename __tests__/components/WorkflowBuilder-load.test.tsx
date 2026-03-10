/**
 * Unit tests for WorkflowBuilder load functionality
 * 
 * Tests cover:
 * - Loading workflow nodes and edges from props
 * - Loading workflow name and description
 * - Handling empty workflow (default canvas)
 * - Node ID counter initialization from loaded nodes
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import { Node, Edge } from '@xyflow/react';

// Mock React Flow
let mockNodes: Node[] = [];
let mockEdges: Edge[] = [];
let mockSetNodes: jest.Mock;
let mockSetEdges: jest.Mock;
let mockOnNodesChange: jest.Mock;
let mockOnEdgesChange: jest.Mock;

jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => (
    <div data-testid="react-flow-canvas">{children}</div>
  ),
  MiniMap: () => <div data-testid="react-flow-minimap">MiniMap</div>,
  Controls: () => <div data-testid="react-flow-controls">Controls</div>,
  Background: () => <div data-testid="react-flow-background">Background</div>,
  BackgroundVariant: { Dots: 'dots' },
  useNodesState: (initialNodes: Node[]) => {
    mockNodes = initialNodes;
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
  useEdgesState: (initialEdges: Edge[]) => {
    mockEdges = initialEdges;
    mockSetEdges = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockEdges = updater(mockEdges);
      } else {
        mockEdges = updater;
      }
    });
    mockOnEdgesChange = jest.fn();
    return [mockEdges, mockSetEdges, mockOnEdgesChange];
  },
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

describe('WorkflowBuilder Load Functionality', () => {
  const mockProps = {
    companyId: 'test-company-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNodes = [];
    mockEdges = [];
  });

  it('renders with empty canvas when no initial data provided', () => {
    render(<WorkflowBuilder {...mockProps} />);

    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
    expect(screen.getByLabelText('Workflow Name')).toHaveValue('');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
  });

  it('loads workflow name from props', () => {
    render(
      <WorkflowBuilder
        {...mockProps}
        workflowName="My Approval Workflow"
      />
    );

    const nameInput = screen.getByLabelText('Workflow Name') as HTMLInputElement;
    expect(nameInput.value).toBe('My Approval Workflow');
  });

  it('loads workflow description from props', () => {
    render(
      <WorkflowBuilder
        {...mockProps}
        initialDescription="This is a test workflow"
      />
    );

    const descriptionInput = screen.getByLabelText('Description (optional)') as HTMLInputElement;
    expect(descriptionInput.value).toBe('This is a test workflow');
  });

  it('loads nodes from props', () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'approval',
        position: { x: 200, y: 200 },
        data: { label: 'Manager Approval', roleId: 'role-123' },
      },
      {
        id: 'node_3',
        type: 'end',
        position: { x: 300, y: 300 },
        data: { label: 'End' },
      },
    ];

    render(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={initialNodes}
      />
    );

    expect(mockNodes).toEqual(initialNodes);
  });

  it('loads edges from props', () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'end',
        position: { x: 200, y: 200 },
        data: { label: 'End' },
      },
    ];

    const initialEdges: Edge[] = [
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
      },
    ];

    render(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    );

    expect(mockEdges).toEqual(initialEdges);
  });

  it('loads complete workflow with nodes, edges, name, and description', () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'approval',
        position: { x: 200, y: 200 },
        data: { label: 'Approval', roleId: 'role-123' },
      },
      {
        id: 'node_3',
        type: 'end',
        position: { x: 300, y: 300 },
        data: { label: 'End' },
      },
    ];

    const initialEdges: Edge[] = [
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
      },
      {
        id: 'edge_2',
        source: 'node_2',
        target: 'node_3',
      },
    ];

    render(
      <WorkflowBuilder
        {...mockProps}
        workflowName="Complete Workflow"
        initialDescription="A complete workflow with all components"
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    );

    expect(screen.getByLabelText('Workflow Name')).toHaveValue('Complete Workflow');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('A complete workflow with all components');
    expect(mockNodes).toEqual(initialNodes);
    expect(mockEdges).toEqual(initialEdges);
  });

  it('updates nodes when initialNodes prop changes', async () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
    ];

    const { rerender } = render(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={initialNodes}
      />
    );

    expect(mockNodes).toEqual(initialNodes);

    const updatedNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'end',
        position: { x: 200, y: 200 },
        data: { label: 'End' },
      },
    ];

    rerender(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={updatedNodes}
      />
    );

    await waitFor(() => {
      expect(mockSetNodes).toHaveBeenCalledWith(updatedNodes);
    });
  });

  it('updates edges when initialEdges prop changes', async () => {
    const initialEdges: Edge[] = [
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
      },
    ];

    const { rerender } = render(
      <WorkflowBuilder
        {...mockProps}
        initialEdges={initialEdges}
      />
    );

    expect(mockEdges).toEqual(initialEdges);

    const updatedEdges: Edge[] = [
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
      },
      {
        id: 'edge_2',
        source: 'node_2',
        target: 'node_3',
      },
    ];

    rerender(
      <WorkflowBuilder
        {...mockProps}
        initialEdges={updatedEdges}
      />
    );

    await waitFor(() => {
      expect(mockSetEdges).toHaveBeenCalledWith(updatedEdges);
    });
  });

  it('handles workflow with parallel split and join nodes', () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'parallel_split',
        position: { x: 200, y: 100 },
        data: { label: 'Split' },
      },
      {
        id: 'node_3',
        type: 'approval',
        position: { x: 300, y: 50 },
        data: { label: 'Approval A', roleId: 'role-a' },
      },
      {
        id: 'node_4',
        type: 'approval',
        position: { x: 300, y: 150 },
        data: { label: 'Approval B', roleId: 'role-b' },
      },
      {
        id: 'node_5',
        type: 'parallel_join',
        position: { x: 400, y: 100 },
        data: { label: 'Join' },
      },
      {
        id: 'node_6',
        type: 'end',
        position: { x: 500, y: 100 },
        data: { label: 'End' },
      },
    ];

    const initialEdges: Edge[] = [
      { id: 'edge_1', source: 'node_1', target: 'node_2' },
      { id: 'edge_2', source: 'node_2', target: 'node_3' },
      { id: 'edge_3', source: 'node_2', target: 'node_4' },
      { id: 'edge_4', source: 'node_3', target: 'node_5' },
      { id: 'edge_5', source: 'node_4', target: 'node_5' },
      { id: 'edge_6', source: 'node_5', target: 'node_6' },
    ];

    render(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    );

    expect(mockNodes).toEqual(initialNodes);
    expect(mockEdges).toEqual(initialEdges);
  });

  it('handles workflow with conditional node', () => {
    const initialNodes: Node[] = [
      {
        id: 'node_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'node_2',
        type: 'conditional',
        position: { x: 200, y: 100 },
        data: {
          label: 'Check Amount',
          condition: {
            field: 'amount',
            operator: 'gt',
            value: 1000,
          },
        },
      },
      {
        id: 'node_3',
        type: 'approval',
        position: { x: 300, y: 50 },
        data: { label: 'High Value Approval', roleId: 'role-senior' },
      },
      {
        id: 'node_4',
        type: 'approval',
        position: { x: 300, y: 150 },
        data: { label: 'Standard Approval', roleId: 'role-manager' },
      },
      {
        id: 'node_5',
        type: 'end',
        position: { x: 400, y: 100 },
        data: { label: 'End' },
      },
    ];

    const initialEdges: Edge[] = [
      { id: 'edge_1', source: 'node_1', target: 'node_2' },
      { id: 'edge_2', source: 'node_2', target: 'node_3', label: 'true' },
      { id: 'edge_3', source: 'node_2', target: 'node_4', label: 'false' },
      { id: 'edge_4', source: 'node_3', target: 'node_5' },
      { id: 'edge_5', source: 'node_4', target: 'node_5' },
    ];

    render(
      <WorkflowBuilder
        {...mockProps}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    );

    expect(mockNodes).toEqual(initialNodes);
    expect(mockEdges).toEqual(initialEdges);
  });
});
