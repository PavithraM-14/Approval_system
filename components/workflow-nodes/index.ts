import StartNode from './StartNode';
import EndNode from './EndNode';
import ApprovalNode from './ApprovalNode';
import ParallelSplitNode from './ParallelSplitNode';
import ParallelJoinNode from './ParallelJoinNode';
import GroupingNode from './GroupingNode';
import SubGroupNode from './SubGroupNode';
import OptionsNode from './OptionsNode';

export { StartNode, EndNode, ApprovalNode, ParallelSplitNode, ParallelJoinNode, GroupingNode, SubGroupNode, OptionsNode };

// Node type definitions for React Flow
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  approval: ApprovalNode,
  parallel_split: ParallelSplitNode,
  parallel_join: ParallelJoinNode,
  grouping: GroupingNode,
  subgroup: SubGroupNode,
  options: OptionsNode,
};
