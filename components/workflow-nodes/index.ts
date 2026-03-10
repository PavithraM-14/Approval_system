import StartNode from './StartNode';
import EndNode from './EndNode';
import ApprovalNode from './ApprovalNode';
import ParallelSplitNode from './ParallelSplitNode';
import ParallelJoinNode from './ParallelJoinNode';
import ConditionalNode from './ConditionalNode';

export { StartNode, EndNode, ApprovalNode, ParallelSplitNode, ParallelJoinNode, ConditionalNode };

// Node type definitions for React Flow
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  approval: ApprovalNode,
  parallel_split: ParallelSplitNode,
  parallel_join: ParallelJoinNode,
  conditional: ConditionalNode,
};
