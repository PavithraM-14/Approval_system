import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import StartNode from '@/components/workflow-nodes/StartNode';
import EndNode from '@/components/workflow-nodes/EndNode';
import ApprovalNode from '@/components/workflow-nodes/ApprovalNode';
import ParallelSplitNode from '@/components/workflow-nodes/ParallelSplitNode';
import ParallelJoinNode from '@/components/workflow-nodes/ParallelJoinNode';
import ConditionalNode from '@/components/workflow-nodes/ConditionalNode';

// Mock React Flow Handle component
jest.mock('@xyflow/react', () => ({
  Handle: ({ title, ...props }: any) => (
    <div data-testid={`handle-${props.type}-${props.position}`} data-type={props.type} title={title} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

describe('Node Component Tooltips', () => {
  describe('StartNode', () => {
    it('has tooltip on the node container', () => {
      const { container } = render(
        <StartNode
          {...({
            id: 'start-1',
            data: { label: 'Start Workflow' },
            selected: false,
            isConnectable: true,
            type: 'start',
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Start Node - Workflow entry point');
    });

    it('has tooltip on source handle', () => {
      const { getByTestId } = render(
        <StartNode
          {...({
            id: 'start-1',
            data: { label: 'Start' },
            selected: false,
            isConnectable: true,
            type: 'start',
          } as any)}
        />
      );
      
      const sourceHandle = getByTestId('handle-source-right');
      expect(sourceHandle).toHaveAttribute('title', 'Connect to first step');
    });
  });

  describe('EndNode', () => {
    it('has tooltip on the node container', () => {
      const { container } = render(
        <EndNode
          {...({
            id: 'end-1',
            data: { label: 'End Workflow' },
            selected: false,
            isConnectable: true,
            type: 'end',
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'End Node - Workflow completion point');
    });

    it('has tooltip on target handle', () => {
      const { getByTestId } = render(
        <EndNode
          {...({
            id: 'end-1',
            data: { label: 'End' },
            selected: false,
            isConnectable: true,
            type: 'end',
          } as any)}
        />
      );
      
      const targetHandle = getByTestId('handle-target-left');
      expect(targetHandle).toHaveAttribute('title', 'Connect from final step');
    });
  });

  describe('ApprovalNode', () => {
    it('has tooltip on the node container without role', () => {
      const { container } = render(
        <ApprovalNode
          {...({
            id: 'approval-1',
            data: { label: 'Approval' },
            selected: false,
            isConnectable: true,
            type: 'approval',
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Approval Node');
    });

    it('has tooltip on the node container with role', () => {
      const { container } = render(
        <ApprovalNode
          {...({
            id: 'approval-1',
            data: { label: 'Approval', roleName: 'Manager' },
            selected: false,
            isConnectable: true,
            type: 'approval',
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Approval Node - Role: Manager');
    });

    it('has tooltips on handles', () => {
      const { getByTestId } = render(
        <ApprovalNode
          {...({
            id: 'approval-1',
            data: { label: 'Approval' },
            selected: false,
            isConnectable: true,
            type: 'approval',
          } as any)}
        />
      );
      
      const targetHandle = getByTestId('handle-target-left');
      expect(targetHandle).toHaveAttribute('title', 'Connect from previous step');
      
      const sourceHandle = getByTestId('handle-source-right');
      expect(sourceHandle).toHaveAttribute('title', 'Connect to next step');
    });
  });

  describe('ParallelSplitNode', () => {
    it('has tooltip on the node container', () => {
      const { container } = render(
        <ParallelSplitNode
          {...({
            id: 'split-1',
            data: { label: 'Split' },
            selected: false,
            isConnectable: true,
            type: 'parallel_split',
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Parallel Split - Creates multiple parallel approval paths');
    });

    it('has tooltips on handles', () => {
      const { getByTestId } = render(
        <ParallelSplitNode
          {...({
            id: 'split-1',
            type: 'parallel_split',
            data: { label: 'Split' },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const targetHandle = getByTestId('handle-target-left');
      expect(targetHandle).toHaveAttribute('title', 'Connect from previous step');
    });
  });

  describe('ParallelJoinNode', () => {
    it('has tooltip on the node container', () => {
      const { container } = render(
        <ParallelJoinNode
          {...({
            id: 'join-1',
            type: 'parallel_join',
            data: { label: 'Join' },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Parallel Join - Waits for all parallel paths to complete');
    });

    it('has tooltips on handles', () => {
      const { getByTestId } = render(
        <ParallelJoinNode
          {...({
            id: 'join-1',
            type: 'parallel_join',
            data: { label: 'Join' },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const sourceHandle = getByTestId('handle-source-right');
      expect(sourceHandle).toHaveAttribute('title', 'Connect to next step');
    });
  });

  describe('ConditionalNode', () => {
    it('has tooltip on the node container without condition', () => {
      const { container } = render(
        <ConditionalNode
          {...({
            id: 'cond-1',
            type: 'conditional',
            data: { label: 'Condition' },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Conditional Node');
    });

    it('has tooltip on the node container with condition', () => {
      const { container } = render(
        <ConditionalNode
          {...({
            id: 'cond-1',
            type: 'conditional',
            data: {
              label: 'Condition',
              condition: {
                field: 'amount',
                operator: 'gt',
                value: 1000,
              },
            },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const nodeContainer = container.querySelector('div[title]');
      expect(nodeContainer).toHaveAttribute('title', 'Conditional Node - amount > 1000');
    });

    it('has tooltips on handles', () => {
      const { getByTestId } = render(
        <ConditionalNode
          {...({
            id: 'cond-1',
            type: 'conditional',
            data: { label: 'Condition' },
            selected: false,
            isConnectable: true,
          } as any)}
        />
      );
      
      const targetHandle = getByTestId('handle-target-left');
      expect(targetHandle).toHaveAttribute('title', 'Connect from previous step');
    });
  });
});
