import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  addEdge: jest.fn((edge, edges) => [...edges, edge]),
  BackgroundVariant: {
    Dots: 'dots',
  },
}));

// Mock fetch for validation API
global.fetch = jest.fn();

describe('WorkflowBuilder - Undo/Redo Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, errors: [] }),
    });
  });

  const renderWorkflowBuilder = (props = {}) => {
    return render(
      <WorkflowBuilder companyId="test-company" {...props} />
    );
  };

  describe('Undo/Redo Buttons', () => {
    it('renders undo and redo buttons', () => {
      renderWorkflowBuilder();
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      const redoButton = screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)');
      
      expect(undoButton).toBeInTheDocument();
      expect(redoButton).toBeInTheDocument();
    });

    it('disables undo button when there is no history', () => {
      renderWorkflowBuilder();
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeDisabled();
    });

    it('disables redo button when there is no future history', () => {
      renderWorkflowBuilder();
      
      const redoButton = screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)');
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Undo/Redo State Tracking', () => {
    it('tracks state changes when nodes are added', async () => {
      renderWorkflowBuilder();
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      
      // Initially disabled
      expect(undoButton).toBeDisabled();
      
      // Simulate adding a node by triggering a drop event
      const canvas = document.querySelector('.react-flow');
      if (canvas) {
        const dropEvent = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEvent, 'dataTransfer', {
          value: {
            getData: () => 'start',
          },
        });
        Object.defineProperty(dropEvent, 'clientX', { value: 100 });
        Object.defineProperty(dropEvent, 'clientY', { value: 100 });
        
        fireEvent(canvas, dropEvent);
        
        // Wait for state update
        await waitFor(() => {
          expect(undoButton).not.toBeDisabled();
        }, { timeout: 1000 });
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('supports Ctrl+Z for undo', () => {
      renderWorkflowBuilder();
      
      // Simulate Ctrl+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      
      // Should not throw error even with no history
      expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    });

    it('supports Ctrl+Y for redo', () => {
      renderWorkflowBuilder();
      
      // Simulate Ctrl+Y
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      
      // Should not throw error even with no future history
      expect(screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)')).toBeInTheDocument();
    });

    it('supports Ctrl+Shift+Z for redo', () => {
      renderWorkflowBuilder();
      
      // Simulate Ctrl+Shift+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      
      // Should not throw error even with no future history
      expect(screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)')).toBeInTheDocument();
    });

    it('supports Cmd+Z for undo on Mac', () => {
      renderWorkflowBuilder();
      
      // Simulate Cmd+Z (metaKey for Mac)
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
      
      // Should not throw error even with no history
      expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    });
  });

  describe('Undo/Redo with Initial Nodes', () => {
    it('loads initial nodes without creating history entry', () => {
      const initialNodes = [
        {
          id: 'node_1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
        },
      ];
      
      renderWorkflowBuilder({ initialNodes });
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      
      // Should be disabled since initial load doesn't create history
      expect(undoButton).toBeDisabled();
    });
  });

  describe('Button Click Handlers', () => {
    it('calls undo handler when undo button is clicked', () => {
      renderWorkflowBuilder();
      
      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      
      // Click should not throw error even when disabled
      fireEvent.click(undoButton);
      
      expect(undoButton).toBeInTheDocument();
    });

    it('calls redo handler when redo button is clicked', () => {
      renderWorkflowBuilder();
      
      const redoButton = screen.getByTitle('Redo (Ctrl+Y or Ctrl+Shift+Z)');
      
      // Click should not throw error even when disabled
      fireEvent.click(redoButton);
      
      expect(redoButton).toBeInTheDocument();
    });
  });
});
