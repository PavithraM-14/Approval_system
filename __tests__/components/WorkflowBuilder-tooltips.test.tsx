import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilder from '@/components/WorkflowBuilder';

// Mock React Flow
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
  MiniMap: () => <div data-testid="minimap" />,
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
  BackgroundVariant: { Dots: 'dots' },
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

// Mock dagre
jest.mock('dagre', () => ({
  graphlib: {
    Graph: jest.fn().mockImplementation(() => ({
      setDefaultEdgeLabel: jest.fn(),
      setGraph: jest.fn(),
      setNode: jest.fn(),
      setEdge: jest.fn(),
      node: jest.fn().mockReturnValue({ x: 100, y: 100 }),
    })),
  },
  layout: jest.fn(),
}));

// Mock workflow nodes
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

describe('WorkflowBuilder Tooltips and Visual Feedback', () => {
  const mockProps = {
    companyId: 'test-company-123',
    onSave: jest.fn(),
  };

  describe('Node Palette Tooltips', () => {
    it('adds title attribute to Start node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const startNode = screen.getByText('Start').closest('div[draggable="true"]');
      expect(startNode).toHaveAttribute('title', 'Start: Workflow entry point');
    });

    it('adds title attribute to End node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const endNode = screen.getByText('End').closest('div[draggable="true"]');
      expect(endNode).toHaveAttribute('title', 'End: Workflow completion');
    });

    it('adds title attribute to Approval node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const approvalNode = screen.getByText('Approval').closest('div[draggable="true"]');
      expect(approvalNode).toHaveAttribute('title', 'Approval: Requires role approval');
    });

    it('adds title attribute to Parallel Split node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const parallelSplitNode = screen.getByText('Parallel Split').closest('div[draggable="true"]');
      expect(parallelSplitNode).toHaveAttribute('title', 'Parallel Split: Split into parallel paths');
    });

    it('adds title attribute to Parallel Join node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const parallelJoinNode = screen.getByText('Parallel Join').closest('div[draggable="true"]');
      expect(parallelJoinNode).toHaveAttribute('title', 'Parallel Join: Wait for all paths');
    });

    it('adds title attribute to Conditional node palette item', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const conditionalNode = screen.getByText('Conditional').closest('div[draggable="true"]');
      expect(conditionalNode).toHaveAttribute('title', 'Conditional: Route based on condition');
    });
  });

  describe('Toolbar Button Tooltips', () => {
    it('adds title attribute to Undo button', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeInTheDocument();
    });

    it('adds title attribute to Redo button', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const redoButton = screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)');
      expect(redoButton).toBeInTheDocument();
    });

    it('adds title attribute to Auto Layout button', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const autoLayoutButton = screen.getByTitle('Auto-arrange nodes for better clarity');
      expect(autoLayoutButton).toBeInTheDocument();
    });
  });

  describe('Drag Feedback', () => {
    it('palette items have onDragEnd handler for visual feedback', () => {
      render(<WorkflowBuilder {...mockProps} />);
      
      const startNode = screen.getByText('Start').closest('div[draggable="true"]');
      expect(startNode).toHaveAttribute('draggable', 'true');
      
      // The onDragEnd handler is attached, which will restore opacity
      // We can't easily test the actual drag behavior in jsdom, but we can verify the element is draggable
      expect(startNode).toBeInTheDocument();
    });
  });
});
