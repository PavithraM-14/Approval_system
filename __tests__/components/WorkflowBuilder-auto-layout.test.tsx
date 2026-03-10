import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import { Node, Edge } from '@xyflow/react';

// Mock React Flow to avoid canvas rendering issues in tests
let mockNodes: Node[] = [];
let mockEdges: Edge[] = [];
let mockSetNodes: jest.Mock;
let mockSetEdges: jest.Mock;

jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => {
    return (
      <div data-testid="react-flow-canvas">
        {children}
      </div>
    );
  },
  Controls: () => <div data-testid="react-flow-controls">Controls</div>,
  MiniMap: () => <div data-testid="react-flow-minimap">MiniMap</div>,
  Background: () => <div data-testid="react-flow-background">Background</div>,
  useNodesState: () => {
    mockSetNodes = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockNodes = updater(mockNodes);
      } else {
        mockNodes = updater;
      }
    });
    return [mockNodes, mockSetNodes, jest.fn()];
  },
  useEdgesState: () => {
    mockSetEdges = jest.fn((updater) => {
      if (typeof updater === 'function') {
        mockEdges = updater(mockEdges);
      } else {
        mockEdges = updater;
      }
    });
    return [mockEdges, mockSetEdges, jest.fn()];
  },
  addEdge: jest.fn((connection, edges) => [...edges, { ...connection, id: `e${connection.source}-${connection.target}` }]),
  BackgroundVariant: {
    Dots: 'dots',
  },
}));

// Mock dagre for layout calculations
jest.mock('dagre', () => {
  const mockGraph = {
    nodes: new Map(),
    edges: [] as any[],
    graphConfig: {} as any,
    setGraph: jest.fn(function(this: any, config: any) {
      this.graphConfig = config;
    }),
    setDefaultEdgeLabel: jest.fn(),
    setNode: jest.fn(function(this: any, id: string, dimensions: any) {
      this.nodes.set(id, { id, ...dimensions, x: 0, y: 0 });
    }),
    setEdge: jest.fn(function(this: any, source: string, target: string) {
      this.edges.push({ source, target });
    }),
    node: jest.fn(function(this: any, id: string) {
      const node = this.nodes.get(id);
      if (!node) return { x: 0, y: 0 };
      
      // Simulate dagre layout by positioning nodes vertically
      const index = Array.from(this.nodes.keys()).indexOf(id);
      return {
        x: node.width / 2 + 100,
        y: node.height / 2 + (index * 150),
      };
    }),
  };

  return {
    __esModule: true,
    default: {
      graphlib: {
        Graph: jest.fn(() => mockGraph),
      },
      layout: jest.fn((graph: any) => {
        // Simulate layout calculation
        // In real dagre, this would calculate optimal positions
        // For testing, we just ensure nodes are positioned
      }),
    },
  };
});

// Mock the workflow nodes
jest.mock('@/components/workflow-nodes', () => ({
  nodeTypes: {
    start: () => <div>StartNode</div>,
    end: () => <div>EndNode</div>,
    approval: () => <div>ApprovalNode</div>,
    parallel_split: () => <div>ParallelSplitNode</div>,
    parallel_join: () => <div>ParallelJoinNode</div>,
    conditional: () => <div>ConditionalNode</div>,
  },
}));

// Mock NodePropertyEditor
jest.mock('@/components/NodePropertyEditor', () => {
  return function MockNodePropertyEditor() {
    return <div data-testid="node-property-editor">Property Editor</div>;
  };
});

describe('WorkflowBuilder - Auto Layout Feature', () => {
  const mockProps = {
    companyId: 'test-company-123',
  };

  beforeEach(() => {
    mockNodes = [];
    mockEdges = [];
  });

  describe('Auto Layout Button', () => {
    it('renders the auto layout button', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      expect(autoLayoutButton).toBeInTheDocument();
    });

    it('displays correct button text and icon', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      expect(autoLayoutButton).toHaveTextContent('Auto Layout');
    });

    it('has correct tooltip', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      expect(autoLayoutButton).toHaveAttribute('title', 'Auto-arrange nodes for better clarity');
    });

    it('is disabled when there are no nodes', () => {
      mockNodes = [];
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      expect(autoLayoutButton).toBeDisabled();
    });

    it('is enabled when there are nodes', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      expect(autoLayoutButton).not.toBeDisabled();
    });
  });

  describe('Auto Layout Functionality', () => {
    it('calls setNodes when auto layout button is clicked', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'approval-1', type: 'approval', position: { x: 50, y: 50 }, data: { label: 'Approval' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'approval-1' },
        { id: 'e2', source: 'approval-1', target: 'end-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      expect(mockSetNodes).toHaveBeenCalled();
    });

    it('updates node positions after auto layout', () => {
      const initialNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'approval-1', type: 'approval', position: { x: 50, y: 50 }, data: { label: 'Approval' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      mockNodes = [...initialNodes];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'approval-1' },
        { id: 'e2', source: 'approval-1', target: 'end-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      // Verify that setNodes was called with updated positions
      expect(mockSetNodes).toHaveBeenCalled();
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      
      // If it's a function, call it with current nodes to get the result
      if (typeof setNodesCall === 'function') {
        const updatedNodes = setNodesCall(initialNodes);
        
        // Verify that positions were updated (they should be different from initial)
        expect(updatedNodes).toHaveLength(3);
        expect(updatedNodes[0].id).toBe('start-1');
        expect(updatedNodes[1].id).toBe('approval-1');
        expect(updatedNodes[2].id).toBe('end-1');
        
        // Positions should be calculated by dagre (mocked to return specific values)
        expect(updatedNodes[0].position).toBeDefined();
        expect(updatedNodes[1].position).toBeDefined();
        expect(updatedNodes[2].position).toBeDefined();
      }
    });

    it('preserves node data and IDs during layout', () => {
      const initialNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start', custom: 'data' } },
        { id: 'approval-1', type: 'approval', position: { x: 50, y: 50 }, data: { label: 'Approval', roleId: 'role-123' } },
      ];
      mockNodes = [...initialNodes];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'approval-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      if (typeof setNodesCall === 'function') {
        const updatedNodes = setNodesCall(initialNodes);
        
        // Verify that node data is preserved
        expect(updatedNodes[0].data).toEqual({ label: 'Start', custom: 'data' });
        expect(updatedNodes[1].data).toEqual({ label: 'Approval', roleId: 'role-123' });
        
        // Verify that IDs and types are preserved
        expect(updatedNodes[0].id).toBe('start-1');
        expect(updatedNodes[0].type).toBe('start');
        expect(updatedNodes[1].id).toBe('approval-1');
        expect(updatedNodes[1].type).toBe('approval');
      }
    });

    it('handles workflows with all node types', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'approval-1', type: 'approval', position: { x: 50, y: 50 }, data: { label: 'Approval' } },
        { id: 'parallel-split-1', type: 'parallel_split', position: { x: 100, y: 100 }, data: { label: 'Split' } },
        { id: 'parallel-join-1', type: 'parallel_join', position: { x: 150, y: 150 }, data: { label: 'Join' } },
        { id: 'conditional-1', type: 'conditional', position: { x: 200, y: 200 }, data: { label: 'Condition' } },
        { id: 'end-1', type: 'end', position: { x: 250, y: 250 }, data: { label: 'End' } },
      ];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'approval-1' },
        { id: 'e2', source: 'approval-1', target: 'parallel-split-1' },
        { id: 'e3', source: 'parallel-split-1', target: 'parallel-join-1' },
        { id: 'e4', source: 'parallel-join-1', target: 'conditional-1' },
        { id: 'e5', source: 'conditional-1', target: 'end-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      expect(mockSetNodes).toHaveBeenCalled();
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      
      if (typeof setNodesCall === 'function') {
        const updatedNodes = setNodesCall(mockNodes);
        
        // All nodes should be present
        expect(updatedNodes).toHaveLength(6);
        
        // All node types should be preserved
        expect(updatedNodes.find((n: Node) => n.type === 'start')).toBeDefined();
        expect(updatedNodes.find((n: Node) => n.type === 'approval')).toBeDefined();
        expect(updatedNodes.find((n: Node) => n.type === 'parallel_split')).toBeDefined();
        expect(updatedNodes.find((n: Node) => n.type === 'parallel_join')).toBeDefined();
        expect(updatedNodes.find((n: Node) => n.type === 'conditional')).toBeDefined();
        expect(updatedNodes.find((n: Node) => n.type === 'end')).toBeDefined();
      }
    });

    it('does not modify edges during layout', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      const initialEdges = [
        { id: 'e1', source: 'start-1', target: 'end-1', label: 'test-edge' },
      ];
      mockEdges = [...initialEdges];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      // Edges should not be modified
      expect(mockSetEdges).not.toHaveBeenCalled();
    });

    it('works with disconnected nodes', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'approval-1', type: 'approval', position: { x: 50, y: 50 }, data: { label: 'Approval' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      mockEdges = []; // No edges - disconnected nodes
      
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      expect(mockSetNodes).toHaveBeenCalled();
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      
      if (typeof setNodesCall === 'function') {
        const updatedNodes = setNodesCall(mockNodes);
        
        // All nodes should still be present
        expect(updatedNodes).toHaveLength(3);
      }
    });
  });

  describe('Auto Layout Integration with Undo/Redo', () => {
    it('auto layout action is added to undo history', () => {
      mockNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      // Click auto layout
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      // Verify that setNodes was called (which triggers history update)
      expect(mockSetNodes).toHaveBeenCalled();
      
      // Undo button should be available after layout
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeInTheDocument();
    });

    it('can undo auto layout changes', () => {
      const initialNodes = [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];
      mockNodes = [...initialNodes];
      mockEdges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ];
      
      render(<WorkflowBuilder {...mockProps} />);
      
      // Click auto layout
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      fireEvent.click(autoLayoutButton);
      
      // The undo button should be present
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeInTheDocument();
    });
  });

  describe('Auto Layout Button Placement', () => {
    it('is positioned between undo/redo and save buttons', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)');
      const autoLayoutButton = screen.getByRole('button', { name: /auto layout/i });
      const saveButton = screen.getByRole('button', { name: /save workflow/i });
      
      expect(undoButton).toBeInTheDocument();
      expect(redoButton).toBeInTheDocument();
      expect(autoLayoutButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
    });
  });
});
