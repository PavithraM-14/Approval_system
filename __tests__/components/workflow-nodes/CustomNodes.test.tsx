import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  StartNode,
  EndNode,
  ApprovalNode,
  ParallelSplitNode,
  ParallelJoinNode,
  ConditionalNode,
} from '@/components/workflow-nodes';

// Mock React Flow components
jest.mock('@xyflow/react', () => ({
  Handle: ({ type, position, id, className, style }: any) => (
    <div
      data-testid={`handle-${type}-${id || position}`}
      data-type={type}
      data-position={position}
      className={className}
      style={style}
    />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

describe('StartNode Component', () => {
  const mockProps = {
    id: 'start-1',
    type: 'start' as const,
    data: { label: 'Start Workflow' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders start node with label', () => {
    render(<StartNode {...mockProps} />);
    expect(screen.getByText('Start Workflow')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<StartNode {...propsWithoutLabel} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    const propsWithDescription = {
      ...mockProps,
      data: { label: 'Start', description: 'Entry point' },
    };
    render(<StartNode {...propsWithDescription} />);
    expect(screen.getByText('Entry point')).toBeInTheDocument();
  });

  it('has source handle for outgoing connections', () => {
    render(<StartNode {...mockProps} />);
    const handle = screen.getByTestId('handle-source-right');
    expect(handle).toHaveAttribute('data-type', 'source');
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<StartNode {...selectedProps} />);
    const node = container.querySelector('.border-green-600');
    expect(node).toBeInTheDocument();
  });
});

describe('EndNode Component', () => {
  const mockProps = {
    id: 'end-1',
    type: 'end' as const,
    data: { label: 'End Workflow' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders end node with label', () => {
    render(<EndNode {...mockProps} />);
    expect(screen.getByText('End Workflow')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<EndNode {...propsWithoutLabel} />);
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('has target handle for incoming connections', () => {
    render(<EndNode {...mockProps} />);
    const handle = screen.getByTestId('handle-target-left');
    expect(handle).toHaveAttribute('data-type', 'target');
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<EndNode {...selectedProps} />);
    const node = container.querySelector('.border-red-600');
    expect(node).toBeInTheDocument();
  });
});

describe('ApprovalNode Component', () => {
  const mockProps = {
    id: 'approval-1',
    type: 'approval' as const,
    data: {
      label: 'Manager Approval',
      roleId: 'role-123',
      roleName: 'Manager',
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders approval node with label', () => {
    render(<ApprovalNode {...mockProps} />);
    expect(screen.getByText('Manager Approval')).toBeInTheDocument();
  });

  it('displays role name when provided', () => {
    render(<ApprovalNode {...mockProps} />);
    expect(screen.getByText('Role: Manager')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<ApprovalNode {...propsWithoutLabel} />);
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    const propsWithDescription = {
      ...mockProps,
      data: { ...mockProps.data, description: 'Requires manager approval' },
    };
    render(<ApprovalNode {...propsWithDescription} />);
    expect(screen.getByText('Requires manager approval')).toBeInTheDocument();
  });

  it('has both target and source handles', () => {
    render(<ApprovalNode {...mockProps} />);
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-right')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<ApprovalNode {...selectedProps} />);
    const node = container.querySelector('.border-blue-600');
    expect(node).toBeInTheDocument();
  });
});

describe('ParallelSplitNode Component', () => {
  const mockProps = {
    id: 'split-1',
    type: 'parallel_split' as const,
    data: { label: 'Split Path' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders parallel split node with label', () => {
    render(<ParallelSplitNode {...mockProps} />);
    expect(screen.getByText('Split Path')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<ParallelSplitNode {...propsWithoutLabel} />);
    expect(screen.getByText('Parallel Split')).toBeInTheDocument();
  });

  it('has one target handle and two source handles', () => {
    render(<ParallelSplitNode {...mockProps} />);
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-out-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-out-2')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<ParallelSplitNode {...selectedProps} />);
    const border = container.querySelector('.border-purple-600');
    expect(border).toBeInTheDocument();
  });
});

describe('ParallelJoinNode Component', () => {
  const mockProps = {
    id: 'join-1',
    type: 'parallel_join' as const,
    data: { label: 'Join Path' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders parallel join node with label', () => {
    render(<ParallelJoinNode {...mockProps} />);
    expect(screen.getByText('Join Path')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<ParallelJoinNode {...propsWithoutLabel} />);
    expect(screen.getByText('Parallel Join')).toBeInTheDocument();
  });

  it('has two target handles and one source handle', () => {
    render(<ParallelJoinNode {...mockProps} />);
    expect(screen.getByTestId('handle-target-in-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-in-2')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-right')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<ParallelJoinNode {...selectedProps} />);
    const border = container.querySelector('.border-indigo-600');
    expect(border).toBeInTheDocument();
  });
});

describe('ConditionalNode Component', () => {
  const mockProps = {
    id: 'conditional-1',
    type: 'conditional' as const,
    data: {
      label: 'Check Amount',
      condition: {
        field: 'amount',
        operator: 'gt' as const,
        value: 1000,
      },
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  it('renders conditional node with label', () => {
    render(<ConditionalNode {...mockProps} />);
    expect(screen.getByText('Check Amount')).toBeInTheDocument();
  });

  it('renders default label when not provided', () => {
    const propsWithoutLabel = { ...mockProps, data: {} };
    render(<ConditionalNode {...propsWithoutLabel} />);
    expect(screen.getByText('Condition')).toBeInTheDocument();
  });

  it('displays formatted condition', () => {
    render(<ConditionalNode {...mockProps} />);
    expect(screen.getByText('amount > 1000')).toBeInTheDocument();
  });

  it('formats different operators correctly', () => {
    const operators = [
      { operator: 'eq' as const, symbol: '=' },
      { operator: 'ne' as const, symbol: '≠' },
      { operator: 'gte' as const, symbol: '≥' },
      { operator: 'lt' as const, symbol: '<' },
      { operator: 'lte' as const, symbol: '≤' },
      { operator: 'contains' as const, symbol: 'contains' },
    ];

    operators.forEach(({ operator, symbol }) => {
      const props = {
        ...mockProps,
        data: {
          label: 'Test',
          condition: { field: 'test', operator, value: 'value' },
        },
      };
      const { container } = render(<ConditionalNode {...props} />);
      expect(container.textContent).toContain(symbol);
    });
  });

  it('has one target handle and two source handles (true/false)', () => {
    render(<ConditionalNode {...mockProps} />);
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-true')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-false')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = render(<ConditionalNode {...selectedProps} />);
    const border = container.querySelector('.border-amber-600');
    expect(border).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    const propsWithDescription = {
      ...mockProps,
      data: {
        ...mockProps.data,
        description: 'Route based on amount',
      },
    };
    render(<ConditionalNode {...propsWithDescription} />);
    expect(screen.getByText('Route based on amount')).toBeInTheDocument();
  });
});
