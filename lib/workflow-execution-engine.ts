import mongoose from 'mongoose';
import WorkflowConfiguration, { IWorkflowNode, IWorkflowEdge } from '@/models/WorkflowConfiguration';
import ExecutionState, { IExecutionState, IParallelPath } from '@/models/ExecutionState';
import UserRoleAssignment from '@/models/UserRoleAssignment';
import User from '@/models/User';
import Request from '@/models/Request';
import { notifyApprovalPending } from './notification-service';

/**
 * WorkflowExecutionEngine
 * 
 * Core service responsible for executing workflows.
 * Handles workflow initialization, action processing, and state management.
 */
export class WorkflowExecutionEngine {
  /**
   * Initialize a new workflow execution
   * 
   * This method:
   * 1. Loads the active workflow configuration for the company
   * 2. Finds the start node in the workflow
   * 3. Creates a new ExecutionState document with initial state
   * 4. Saves the ExecutionState to the database
   * 5. Returns the created ExecutionState
   * 
   * @param requestId - The ID of the request being processed
   * @param workflowId - The ID of the workflow to execute
   * @param companyId - The ID of the company
   * @returns Promise<IExecutionState> - The created execution state
   * @throws Error if workflow not found, start node not found, or database error
   * 
   * Validates: Requirements 6.1, 6.2
   */
  async initializeExecution(
    requestId: string,
    workflowId: string,
    companyId: string
  ): Promise<IExecutionState> {
    // Validate input parameters
    if (!requestId || !workflowId || !companyId) {
      throw new Error('Missing required parameters: requestId, workflowId, and companyId are required');
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      throw new Error('Invalid workflowId format');
    }
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Invalid companyId format');
    }

    // Load the active workflow configuration for the company
    const workflow = await WorkflowConfiguration.findOne({
      _id: new mongoose.Types.ObjectId(workflowId),
      companyId: new mongoose.Types.ObjectId(companyId),
      isActive: true,
    });

    if (!workflow) {
      throw new Error(`No active workflow found with ID ${workflowId} for company ${companyId}`);
    }

    // Find the start node in the workflow
    const startNode = workflow.nodes.find((node: IWorkflowNode) => node.type === 'start');
    
    if (!startNode) {
      throw new Error(`Workflow ${workflowId} does not have a start node`);
    }

    // Find the first node after start (should be the first approval node)
    const startEdge = workflow.edges.find((edge: IWorkflowEdge) => edge.source === startNode.id);
    if (!startEdge) {
      throw new Error(`No outgoing edge found from start node in workflow ${workflowId}`);
    }

    let firstNode = workflow.nodes.find((node: IWorkflowNode) => node.id === startEdge.target);
    if (!firstNode) {
      throw new Error(`First node after start not found in workflow ${workflowId}`);
    }

    // Skip requester nodes - if the first node is a requester role, advance to the next node
    if (firstNode.type === 'approval') {
      const nodeLabel = firstNode.label || '';
      const isRequesterNode = nodeLabel.toLowerCase().includes('employee') || 
                             nodeLabel.toLowerCase().includes('emplyee') ||
                             nodeLabel.toLowerCase().includes('requester') ||
                             nodeLabel.toLowerCase().includes('creator');
      
      if (isRequesterNode) {
        console.log('[DEBUG] Skipping requester node:', nodeLabel);
        
        // Find the next node after the requester node
        const nextEdge = workflow.edges.find((edge: IWorkflowEdge) => edge.source === firstNode.id);
        if (nextEdge) {
          const nextNode = workflow.nodes.find((node: IWorkflowNode) => node.id === nextEdge.target);
          if (nextNode) {
            console.log('[DEBUG] Advancing to next node:', nextNode.label);
            firstNode = nextNode;
          }
        }
      }
    }

    // Create a new ExecutionState document
    const executionState = new ExecutionState({
      requestId,
      workflowId: workflow._id,
      workflowVersion: workflow.version,
      companyId: workflow.companyId,
      currentNodeId: firstNode.id, // Start at the first non-requester approval node
      status: 'in_progress',
      parallelPaths: [],
      history: [
        {
          nodeId: startNode.id,
          nodeType: startNode.type,
          action: 'entered',
          timestamp: new Date(),
        },
        {
          nodeId: firstNode.id,
          nodeType: firstNode.type,
          action: 'entered',
          timestamp: new Date(),
        },
      ],
      startedAt: new Date(),
    });

    // Save the ExecutionState to the database
    await executionState.save();

    console.log('[DEBUG] Workflow execution initialized:', {
      executionId: executionState._id,
      workflowId,
      currentNodeId: firstNode.id,
      nodeType: firstNode.type,
      nodeLabel: firstNode.label
    });

    return executionState;
  }

  /**
   * Process an action at the current node (approval nodes)
   *
   * This method:
   * 1. Retrieves the execution state and workflow configuration
   * 2. Verifies the current node is an approval node
   * 3. Verifies the user has the required role for the approval node
   * 4. Records the action in the execution history
   * 5. Advances to the next node in the workflow
   * 6. Saves the updated execution state
   *
   * @param executionId - The ID of the execution state
   * @param action - The action to perform ('approved' or 'rejected')
   * @param userId - The ID of the user performing the action
   * @param notes - Optional notes about the action
   * @returns Promise<IExecutionState> - The updated execution state
   * @throws Error if execution not found, user unauthorized, or invalid action
   *
   * Validates: Requirements 6.3, 6.4
   */
  async processAction(
    executionId: string,
    action: 'approved' | 'rejected',
    userId: string,
    notes?: string,
    isForward: boolean = false
  ): Promise<IExecutionState> {
    // Validate input parameters
    if (!executionId || !action || !userId) {
      throw new Error('Missing required parameters: executionId, action, and userId are required');
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId format');
    }

    // Validate action
    if (action !== 'approved' && action !== 'rejected') {
      throw new Error('Invalid action: must be "approved" or "rejected"');
    }

    // Retrieve the execution state
    const executionState = await ExecutionState.findById(executionId);
    if (!executionState) {
      throw new Error(`Execution state not found with ID ${executionId}`);
    }

    // Check if execution is still in progress
    if (executionState.status !== 'in_progress') {
      throw new Error(`Execution is not in progress. Current status: ${executionState.status}`);
    }

    // Load the workflow configuration
    const workflow = await WorkflowConfiguration.findById(executionState.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found with ID ${executionState.workflowId}`);
    }

    // Find the current node
    const currentNode = workflow.nodes.find((node: IWorkflowNode) => node.id === executionState.currentNodeId);
    if (!currentNode) {
      throw new Error(`Current node not found with ID ${executionState.currentNodeId}`);
    }

    // Verify the current node is an approval node
    if (currentNode.type !== 'approval') {
      throw new Error(`Current node is not an approval node. Node type: ${currentNode.type}`);
    }

    // Verify the node has a roleId
    if (!currentNode.data.roleId) {
      throw new Error(`Approval node ${currentNode.id} does not have a roleId specified`);
    }

    // Skip role validation for forward actions - forwarders don't need the approval role
    if (!isForward) {
      // Verify the user has the required role
      // Check both UserRoleAssignment and the user's primary role
      const User = (await import('../models/User')).default;
      const CustomRole = (await import('../models/CustomRole')).default;
      const dbUser = await User.findById(userId).populate('role');
      
      // Get all user role assignments
      const allUserRoleAssignments = await UserRoleAssignment.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('roleId');
      
      // Get the required role details
      const requiredRole = await CustomRole.findById(currentNode.data.roleId);
      
      const userHasPrimaryRole = dbUser?.role?._id?.toString() === currentNode.data.roleId.toString();
      const userHasAssignedRole = allUserRoleAssignments.some(assignment => 
        assignment.roleId._id?.toString() === currentNode.data.roleId.toString()
      );
      
      // Also check by role name in case the role ID doesn't match but the name does
      const userHasRoleByName = allUserRoleAssignments.some(assignment => 
        assignment.roleId.name === requiredRole?.name
      ) || dbUser?.role?.name === requiredRole?.name;
      
      const userRoleAssignment = await UserRoleAssignment.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        roleId: currentNode.data.roleId,
        companyId: executionState.companyId,
      });

      console.log('[DEBUG] Role validation:', {
        userId,
        requiredRoleId: currentNode.data.roleId?.toString(),
        requiredRoleName: requiredRole?.name,
        userPrimaryRoleId: dbUser?.role?._id?.toString(),
        userPrimaryRoleName: dbUser?.role?.name,
        userHasPrimaryRole,
        userHasAssignedRole,
        userHasRoleByName,
        userRoleAssignmentWithCompanyFound: !!userRoleAssignment,
        allUserRoleIds: allUserRoleAssignments.map(a => a.roleId._id?.toString()),
        allUserRoleNames: allUserRoleAssignments.map(a => a.roleId.name),
        companyId: executionState.companyId
      });

      // Allow if user has the required role in any form (by ID or by name)
      if (!userRoleAssignment && !userHasPrimaryRole && !userHasAssignedRole && !userHasRoleByName) {
        throw new Error(`User ${userId} is not assigned to the required role for this approval step`);
      }
    }

    // Record the action in execution history
    executionState.history.push({
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      action,
      userId: new mongoose.Types.ObjectId(userId),
      notes,
      timestamp: new Date(),
    });

    // If rejected, mark execution as rejected and save
    if (action === 'rejected') {
      executionState.status = 'rejected';
      executionState.completedAt = new Date();
      await executionState.save();
      return executionState;
    }

    // Advance to the next node (for approved action)
    // Find the outgoing edge from the current node
    const outgoingEdge = workflow.edges.find((edge: IWorkflowEdge) => edge.source === currentNode.id);

    if (!outgoingEdge) {
      throw new Error(`No outgoing edge found from node ${currentNode.id}`);
    }

    // Get the next node
    const nextNode = workflow.nodes.find((node: IWorkflowNode) => node.id === outgoingEdge.target);
    if (!nextNode) {
      throw new Error(`Next node not found with ID ${outgoingEdge.target}`);
    }

    console.log('[DEBUG] Advancing workflow from node to node:', {
      fromNodeId: currentNode.id,
      fromNodeType: currentNode.type,
      fromNodeLabel: currentNode.label,
      toNodeId: nextNode.id,
      toNodeType: nextNode.type,
      toNodeLabel: nextNode.label
    });

    // Update current node to next node
    executionState.currentNodeId = nextNode.id;

    // Add history entry for entering the next node
    executionState.history.push({
      nodeId: nextNode.id,
      nodeType: nextNode.type,
      action: 'entered',
      timestamp: new Date(),
    });

    // If the next node is an end node, mark execution as completed
    if (nextNode.type === 'end') {
      executionState.status = 'completed';
      executionState.completedAt = new Date();
    }

    // Save the updated execution state
    await executionState.save();

    // Send notifications to users who need to approve at the next node
    if (nextNode.type === 'approval' && nextNode.data.roleId) {
      try {
        // Find all users assigned to the role for the next approval node
        const roleAssignments = await UserRoleAssignment.find({
          roleId: nextNode.data.roleId,
          companyId: executionState.companyId,
        }).lean();

        // Get the request details for the notification
        const request = await Request.findOne({ 
          workflowExecutionId: executionState._id 
        }).populate('requester', 'name email').lean();

        if (request && roleAssignments.length > 0) {
          // Send notification to each user with the required role
          for (const assignment of roleAssignments) {
            const user = await User.findById(assignment.userId).lean();
            if (user) {
              await notifyApprovalPending(
                user._id.toString(),
                request._id.toString(),
                request.title,
                request.requester.name
              );
              console.log('[NOTIFICATION] Sent approval pending notification to:', {
                userId: user._id,
                userName: user.name,
                userEmail: user.email,
                requestId: request._id,
                requestTitle: request.title
              });
            }
          }
        }
      } catch (notificationError) {
        // Log error but don't fail the workflow
        console.error('[ERROR] Failed to send approval notifications:', notificationError);
      }
    }

    return executionState;
  }

  /**
   * Create parallel paths for a parallel split node
   *
   * This method:
   * 1. Retrieves the execution state and workflow configuration
   * 2. Verifies the current node is a parallel_split node
   * 3. Finds all outgoing edges from the split node
   * 4. Finds the corresponding parallel_join node
   * 5. Creates a parallel path entry for each outgoing edge
   * 6. Updates the execution state with the parallel paths
   * 7. Saves the updated execution state
   *
   * @param executionId - The ID of the execution state
   * @param splitNodeId - The ID of the parallel split node
   * @returns Promise<IExecutionState> - The updated execution state with parallel paths
   * @throws Error if execution not found, node is not a parallel split, or no join node found
   *
   * Validates: Requirements 6.5
   */
  async createParallelPaths(
    executionId: string,
    splitNodeId: string
  ): Promise<IExecutionState> {
    // Validate input parameters
    if (!executionId || !splitNodeId) {
      throw new Error('Missing required parameters: executionId and splitNodeId are required');
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }

    // Retrieve the execution state
    const executionState = await ExecutionState.findById(executionId);
    if (!executionState) {
      throw new Error(`Execution state not found with ID ${executionId}`);
    }

    // Check if execution is still in progress
    if (executionState.status !== 'in_progress') {
      throw new Error(`Execution is not in progress. Current status: ${executionState.status}`);
    }

    // Load the workflow configuration
    const workflow = await WorkflowConfiguration.findById(executionState.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found with ID ${executionState.workflowId}`);
    }

    // Find the split node
    const splitNode = workflow.nodes.find((node: IWorkflowNode) => node.id === splitNodeId);
    if (!splitNode) {
      throw new Error(`Split node not found with ID ${splitNodeId}`);
    }

    // Verify the node is a parallel_split node
    if (splitNode.type !== 'parallel_split') {
      throw new Error(`Node ${splitNodeId} is not a parallel_split node. Node type: ${splitNode.type}`);
    }

    // Find all outgoing edges from the split node
    const outgoingEdges = workflow.edges.filter((edge: IWorkflowEdge) => edge.source === splitNodeId);

    if (outgoingEdges.length === 0) {
      throw new Error(`No outgoing edges found from parallel split node ${splitNodeId}`);
    }

    // Find the corresponding parallel_join node
    // We need to traverse the workflow to find where all paths converge
    // For simplicity, we'll find the first parallel_join node that all paths can reach
    const joinNode = this.findParallelJoinNode(workflow, splitNodeId, outgoingEdges);

    if (!joinNode) {
      throw new Error(`No corresponding parallel_join node found for split node ${splitNodeId}`);
    }

    // Create parallel path entries for each outgoing edge
    const parallelPaths = outgoingEdges.map((edge: IWorkflowEdge, index: number) => {
      const targetNode = workflow.nodes.find((node: IWorkflowNode) => node.id === edge.target);
      if (!targetNode) {
        throw new Error(`Target node not found with ID ${edge.target}`);
      }

      return {
        pathId: `${splitNodeId}-path-${index}`,
        splitNodeId: splitNodeId,
        joinNodeId: joinNode.id,
        currentNodeId: targetNode.id,
        status: 'active' as const,
      };
    });

    // Update the execution state with parallel paths
    executionState.parallelPaths.push(...parallelPaths);

    // Add history entries for entering each parallel path
    for (const path of parallelPaths) {
      const targetNode = workflow.nodes.find((node: IWorkflowNode) => node.id === path.currentNodeId);
      if (targetNode) {
        executionState.history.push({
          nodeId: targetNode.id,
          nodeType: targetNode.type,
          action: 'entered',
          timestamp: new Date(),
        });
      }
    }

    // Update current node to indicate we're in parallel execution
    // The currentNodeId will be managed by the parallel paths
    executionState.currentNodeId = splitNodeId;

    // Save the updated execution state
    await executionState.save();

    return executionState;
  }

  /**
   * Check if all parallel paths have completed at a join node
   *
   * This method:
   * 1. Retrieves the execution state and workflow configuration
   * 2. Verifies the specified node is a parallel_join node
   * 3. Finds all parallel paths that should converge at this join node
   * 4. Checks if all those paths have status 'completed'
   * 5. Returns true if all paths are completed, false otherwise
   *
   * @param executionId - The ID of the execution state
   * @param joinNodeId - The ID of the parallel join node
   * @returns Promise<boolean> - True if all parallel paths are completed, false otherwise
   * @throws Error if execution not found, node is not a parallel join, or no parallel paths found
   *
   * Validates: Requirements 6.6
   */
  async checkParallelCompletion(
    executionId: string,
    joinNodeId: string
  ): Promise<boolean> {
    // Validate input parameters
    if (!executionId || !joinNodeId) {
      throw new Error('Missing required parameters: executionId and joinNodeId are required');
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }

    // Retrieve the execution state
    const executionState = await ExecutionState.findById(executionId);
    if (!executionState) {
      throw new Error(`Execution state not found with ID ${executionId}`);
    }

    // Check if execution is still in progress
    if (executionState.status !== 'in_progress') {
      throw new Error(`Execution is not in progress. Current status: ${executionState.status}`);
    }

    // Load the workflow configuration
    const workflow = await WorkflowConfiguration.findById(executionState.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found with ID ${executionState.workflowId}`);
    }

    // Find the join node
    const joinNode = workflow.nodes.find((node: IWorkflowNode) => node.id === joinNodeId);
    if (!joinNode) {
      throw new Error(`Join node not found with ID ${joinNodeId}`);
    }

    // Verify the node is a parallel_join node
    if (joinNode.type !== 'parallel_join') {
      throw new Error(`Node ${joinNodeId} is not a parallel_join node. Node type: ${joinNode.type}`);
    }

    // Find all parallel paths that should converge at this join node
    const pathsForThisJoin = executionState.parallelPaths.filter(
      (path: IParallelPath) => path.joinNodeId === joinNodeId
    );

    if (pathsForThisJoin.length === 0) {
      throw new Error(`No parallel paths found for join node ${joinNodeId}`);
    }

    // Check if all paths are completed
    const allPathsCompleted = pathsForThisJoin.every((path: IParallelPath) => path.status === 'completed');

    return allPathsCompleted;
  }

  /**
   * Evaluate a conditional node expression
   *
   * This method:
   * 1. Retrieves the execution state and workflow configuration
   * 2. Finds the conditional node by ID
   * 3. Extracts the condition from the node data
   * 4. Evaluates the condition against the request data
   * 5. Returns true or false based on the evaluation result
   *
   * Supported operators:
   * - eq: Equal to
   * - ne: Not equal to
   * - gt: Greater than
   * - gte: Greater than or equal to
   * - lt: Less than
   * - lte: Less than or equal to
   * - contains: String contains (case-insensitive)
   *
   * @param executionId - The ID of the execution state
   * @param nodeId - The ID of the conditional node
   * @param requestData - The request data to evaluate against
   * @returns Promise<boolean> - True if condition evaluates to true, false otherwise
   * @throws Error if execution not found, node not found, or node is not conditional
   *
   * Validates: Requirements 6.7, 12.3, 12.4, 12.5
   */
  async evaluateCondition(
    executionId: string,
    nodeId: string,
    requestData: any
  ): Promise<boolean> {
    // Validate input parameters
    if (!executionId || !nodeId || !requestData) {
      throw new Error('Missing required parameters: executionId, nodeId, and requestData are required');
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }

    // Retrieve the execution state
    const executionState = await ExecutionState.findById(executionId);
    if (!executionState) {
      throw new Error(`Execution state not found with ID ${executionId}`);
    }

    // Load the workflow configuration
    const workflow = await WorkflowConfiguration.findById(executionState.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found with ID ${executionState.workflowId}`);
    }

    // Find the conditional node
    const conditionalNode = workflow.nodes.find((node: IWorkflowNode) => node.id === nodeId);
    if (!conditionalNode) {
      throw new Error(`Conditional node not found with ID ${nodeId}`);
    }

    // Verify the node is a conditional node
    if (conditionalNode.type !== 'conditional') {
      throw new Error(`Node ${nodeId} is not a conditional node. Node type: ${conditionalNode.type}`);
    }

    // Verify the node has a condition defined
    if (!conditionalNode.data.condition) {
      throw new Error(`Conditional node ${nodeId} does not have a condition defined`);
    }

    const condition = conditionalNode.data.condition;

    // Extract the field value from request data
    const fieldValue = requestData[condition.field];

    // Evaluate the condition based on the operator
    let result: boolean;

    switch (condition.operator) {
      case 'eq':
        result = fieldValue === condition.value;
        break;

      case 'ne':
        result = fieldValue !== condition.value;
        break;

      case 'gt':
        result = fieldValue > condition.value;
        break;

      case 'gte':
        result = fieldValue >= condition.value;
        break;

      case 'lt':
        result = fieldValue < condition.value;
        break;

      case 'lte':
        result = fieldValue <= condition.value;
        break;

      case 'contains':
        // Case-insensitive string contains check
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          result = fieldValue.toLowerCase().includes(condition.value.toLowerCase());
        } else {
          result = false;
        }
        break;

      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }

    // Record the routing decision in execution history
    executionState.history.push({
      nodeId: conditionalNode.id,
      nodeType: conditionalNode.type,
      action: 'routed',
      timestamp: new Date(),
      routingDecision: result,
    });

    await executionState.save();

    return result;
  }


  /**
   * Helper method to find the parallel join node for a given split node
   *
   * This method traverses the workflow graph to find the parallel_join node
   * where all paths from the split node converge.
   *
   * @param workflow - The workflow configuration
   * @param splitNodeId - The ID of the parallel split node
   * @param outgoingEdges - The outgoing edges from the split node
   * @returns IWorkflowNode | null - The join node or null if not found
   */
  private findParallelJoinNode(
    workflow: any,
    splitNodeId: string,
    outgoingEdges: IWorkflowEdge[]
  ): IWorkflowNode | null {
    // For each path from the split, traverse forward to find join nodes
    const reachableJoinNodes = new Map<string, number>();

    for (const edge of outgoingEdges) {
      const joinNodesInPath = this.findJoinNodesInPath(workflow, edge.target, new Set());
      for (const joinNodeId of joinNodesInPath) {
        reachableJoinNodes.set(joinNodeId, (reachableJoinNodes.get(joinNodeId) || 0) + 1);
      }
    }

    // Find the first join node that is reachable from all paths
    for (const [joinNodeId, count] of reachableJoinNodes.entries()) {
      if (count === outgoingEdges.length) {
        const joinNode = workflow.nodes.find((node: IWorkflowNode) => node.id === joinNodeId);
        if (joinNode && joinNode.type === 'parallel_join') {
          return joinNode;
        }
      }
    }

    return null;
  }

  /**
   * Helper method to find all parallel_join nodes reachable from a given node
   *
   * @param workflow - The workflow configuration
   * @param nodeId - The starting node ID
   * @param visited - Set of visited node IDs to prevent infinite loops
   * @returns Set<string> - Set of join node IDs reachable from the starting node
   */
  private findJoinNodesInPath(
    workflow: any,
    nodeId: string,
    visited: Set<string>
  ): Set<string> {
    const joinNodes = new Set<string>();

    // Prevent infinite loops
    if (visited.has(nodeId)) {
      return joinNodes;
    }
    visited.add(nodeId);

    // Find the node
    const node = workflow.nodes.find((n: IWorkflowNode) => n.id === nodeId);
    if (!node) {
      return joinNodes;
    }

    // If this is a join node, add it
    if (node.type === 'parallel_join') {
      joinNodes.add(nodeId);
      return joinNodes;
    }

    // Find outgoing edges and recursively search
    const outgoingEdges = workflow.edges.filter((edge: IWorkflowEdge) => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      const childJoinNodes = this.findJoinNodesInPath(workflow, edge.target, visited);
      for (const joinNodeId of childJoinNodes) {
        joinNodes.add(joinNodeId);
      }
    }

    return joinNodes;
  }



  /**
   * Get current execution state
   * 
   * @param executionId - The ID of the execution state
   * @returns Promise<IExecutionState> - The execution state
   * @throws Error if execution state not found
   */
  async getExecutionState(executionId: string): Promise<IExecutionState> {
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }

    const executionState = await ExecutionState.findById(executionId);
    
    if (!executionState) {
      throw new Error(`Execution state not found with ID ${executionId}`);
    }

    return executionState;
  }
}

// Export a singleton instance
export const workflowExecutionEngine = new WorkflowExecutionEngine();
