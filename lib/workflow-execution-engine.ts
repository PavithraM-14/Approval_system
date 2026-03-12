import mongoose from 'mongoose';
import WorkflowConfiguration, { IWorkflowNode, IWorkflowEdge } from '@/models/WorkflowConfiguration';
import ExecutionState, { IExecutionState, IParallelPath } from '@/models/ExecutionState';
import UserRoleAssignment from '@/models/UserRoleAssignment';
import UserGroupAssignment from '@/models/UserGroupAssignment';
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
    companyId: string,
    requesterId?: string
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

    // Get requester's group memberships if requesterId is provided
    let requesterGroupIds: mongoose.Types.ObjectId[] = [];
    if (requesterId && mongoose.Types.ObjectId.isValid(requesterId)) {
      const groupAssignments = await UserGroupAssignment.find({
        userId: new mongoose.Types.ObjectId(requesterId),
        companyId: new mongoose.Types.ObjectId(companyId),
      }).lean();
      requesterGroupIds = groupAssignments.map(assignment => assignment.groupId);
      
      console.log('[DEBUG] Requester group memberships:', {
        requesterId,
        groupCount: requesterGroupIds.length,
        groupIds: requesterGroupIds.map(id => id.toString())
      });
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
      requesterGroupIds, // Store requester's groups for routing decisions
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
      nodeLabel: firstNode.label,
      requesterGroupCount: requesterGroupIds.length
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

        // Filter users based on group scope if enabled
        let eligibleUserIds = roleAssignments.map(a => a.userId);
        
        if (nextNode.data.groupScope?.enabled && nextNode.data.groupScope.groupIds && nextNode.data.groupScope.groupIds.length > 0) {
          // Node has group scope - filter users by group membership
          const matchType = nextNode.data.groupScope.matchType || 'any';
          const requiredGroupIds = nextNode.data.groupScope.groupIds.map(id => id.toString());
          
          console.log('[DEBUG] Filtering users by group scope:', {
            nodeId: nextNode.id,
            nodeLabel: nextNode.label,
            requiredGroupIds,
            matchType,
            requesterGroupIds: executionState.requesterGroupIds.map(id => id.toString())
          });
          
          // Get users who match the group criteria
          const eligibleUsers = await this.getUsersMatchingGroupScope(
            eligibleUserIds,
            executionState.requesterGroupIds,
            requiredGroupIds,
            matchType,
            executionState.companyId
          );
          
          eligibleUserIds = eligibleUsers;
          
          console.log('[DEBUG] Users after group filtering:', {
            originalCount: roleAssignments.length,
            filteredCount: eligibleUserIds.length
          });
        }

        // Get the request details for the notification
        const request = await Request.findOne({ 
          workflowExecutionId: executionState._id 
        }).populate('requester', 'name email').lean();

        if (request && eligibleUserIds.length > 0) {
          // Send notification to each eligible user
          for (const userId of eligibleUserIds) {
            const user = await User.findById(userId).lean();
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
        } else if (eligibleUserIds.length === 0) {
          console.warn('[WARNING] No eligible users found for approval node after group filtering:', {
            nodeId: nextNode.id,
            nodeLabel: nextNode.label,
            roleId: nextNode.data.roleId,
            groupScopeEnabled: nextNode.data.groupScope?.enabled
          });
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
   * Get users matching group scope criteria
   * 
   * Filters users based on group membership matching between requester and approvers.
   * Supports 'any' (at least one common group) and 'all' (all required groups) match types.
   * 
   * @param candidateUserIds - User IDs to filter
   * @param requesterGroupIds - Groups the requester belongs to
   * @param requiredGroupIds - Groups required by the node
   * @param matchType - 'any' or 'all' matching strategy
   * @param companyId - Company ID for scoping
   * @returns Promise<mongoose.Types.ObjectId[]> - Filtered user IDs
   */
  private async getUsersMatchingGroupScope(
    candidateUserIds: mongoose.Types.ObjectId[],
    requesterGroupIds: mongoose.Types.ObjectId[],
    requiredGroupIds: string[],
    matchType: 'any' | 'all',
    companyId: mongoose.Types.ObjectId
  ): Promise<mongoose.Types.ObjectId[]> {
    if (candidateUserIds.length === 0) {
      return [];
    }

    // Get group assignments for all candidate users
    const userGroupAssignments = await UserGroupAssignment.find({
      userId: { $in: candidateUserIds },
      companyId: companyId,
    }).lean();

    // Build a map of userId -> groupIds
    const userGroupMap = new Map<string, Set<string>>();
    for (const assignment of userGroupAssignments) {
      const userId = assignment.userId.toString();
      if (!userGroupMap.has(userId)) {
        userGroupMap.set(userId, new Set());
      }
      userGroupMap.get(userId)!.add(assignment.groupId.toString());
    }

    // Convert requester groups to strings for comparison
    const requesterGroupSet = new Set(requesterGroupIds.map(id => id.toString()));
    const requiredGroupSet = new Set(requiredGroupIds);

    // Filter users based on match type
    const matchingUserIds: mongoose.Types.ObjectId[] = [];

    for (const userId of candidateUserIds) {
      const userGroups = userGroupMap.get(userId.toString()) || new Set<string>();
      
      if (matchType === 'any') {
        // User must be in at least one group that matches requester's groups
        // AND that group must be in the required groups
        let hasMatch = false;
        for (const groupId of userGroups) {
          if (requiredGroupSet.has(groupId) && requesterGroupSet.has(groupId)) {
            hasMatch = true;
            break;
          }
        }
        if (hasMatch) {
          matchingUserIds.push(userId);
        }
      } else if (matchType === 'all') {
        // User must be in ALL required groups that the requester is also in
        const requiredAndRequesterGroups = [...requiredGroupSet].filter(g => requesterGroupSet.has(g));
        const hasAllGroups = requiredAndRequesterGroups.every(groupId => userGroups.has(groupId));
        if (hasAllGroups && requiredAndRequesterGroups.length > 0) {
          matchingUserIds.push(userId);
        }
      }
    }

    return matchingUserIds;
  }

  /**
   * Validate workflow configuration for group scope issues
   * 
   * Checks that nodes with group scope have at least one eligible user.
   * Returns validation errors if any nodes would have no approvers.
   * 
   * @param workflowId - The workflow configuration ID
   * @param companyId - Company ID
   * @returns Promise<string[]> - Array of validation error messages (empty if valid)
   */
  async validateWorkflowGroupScope(
    workflowId: string,
    companyId: string
  ): Promise<string[]> {
    const errors: string[] = [];

    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      errors.push('Invalid workflowId format');
      return errors;
    }

    const workflow = await WorkflowConfiguration.findById(workflowId);
    if (!workflow) {
      errors.push('Workflow not found');
      return errors;
    }

    // Check each approval node with group scope
    for (const node of workflow.nodes) {
      if (node.type === 'approval' && node.data.roleId && node.data.groupScope?.enabled) {
        const groupIds = node.data.groupScope.groupIds || [];
        
        if (groupIds.length === 0) {
          errors.push(`Node "${node.label}" has group scope enabled but no groups selected`);
          continue;
        }

        // Find users with the required role
        const roleAssignments = await UserRoleAssignment.find({
          roleId: node.data.roleId,
          companyId: new mongoose.Types.ObjectId(companyId),
        }).lean();

        if (roleAssignments.length === 0) {
          errors.push(`Node "${node.label}" has no users assigned to the required role`);
          continue;
        }

        // Check if any users have the required group memberships
        const userIds = roleAssignments.map(a => a.userId);
        const userGroupAssignments = await UserGroupAssignment.find({
          userId: { $in: userIds },
          groupId: { $in: groupIds },
          companyId: new mongoose.Types.ObjectId(companyId),
        }).lean();

        if (userGroupAssignments.length === 0) {
          errors.push(
            `Node "${node.label}" has group scope restrictions but no users with the required role belong to the specified groups`
          );
        }
      }
    }

    return errors;
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

  /**
   * Process Options node forwarding
   * 
   * This method handles forwarding from Options nodes to multiple target nodes
   * 
   * @param executionId - The ID of the execution state
   * @param selectedOptions - Array of selected option IDs (e.g., ['option-1', 'option-2'])
   * @param userId - The ID of the user making the selection
   * @param notes - Optional notes from the user
   * @returns Promise<IExecutionState> - The updated execution state
   * @throws Error if execution not found, user unauthorized, or invalid options
   */
  async processOptionsAction(
    executionId: string,
    selectedOptions: string[],
    userId: string,
    notes?: string
  ): Promise<IExecutionState> {
    // Validate input parameters
    if (!executionId || !selectedOptions || !userId) {
      throw new Error('Missing required parameters: executionId, selectedOptions, and userId are required');
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(executionId)) {
      throw new Error('Invalid executionId format');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId format');
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

    // Verify the current node is an Options node
    if (currentNode.type !== 'options') {
      throw new Error(`Current node is not an Options node. Node type: ${currentNode.type}`);
    }

    // Validate selected options
    const validOptions = ['option-1', 'option-2', 'option-3', 'option-4', 'option-5'];
    const invalidOptions = selectedOptions.filter(option => !validOptions.includes(option));
    if (invalidOptions.length > 0) {
      throw new Error(`Invalid options selected: ${invalidOptions.join(', ')}`);
    }

    // Find all outgoing edges from the Options node
    const outgoingEdges = workflow.edges.filter((edge: IWorkflowEdge) => edge.source === currentNode.id);
    
    // Find target nodes for selected options
    const selectedEdges = outgoingEdges.filter(edge => 
      selectedOptions.includes(edge.sourceHandle || 'option-1')
    );

    if (selectedEdges.length === 0) {
      throw new Error('No valid target nodes found for selected options');
    }

    // Record the options selection in execution history
    executionState.history.push({
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      action: 'options_selected',
      userId: new mongoose.Types.ObjectId(userId),
      notes,
      timestamp: new Date(),
      selectedOptions,
    });

    // Create parallel paths for each selected option
    const parallelPaths: IParallelPath[] = selectedEdges.map(edge => ({
      pathId: `path_${edge.target}_${Date.now()}`,
      nodeId: edge.target,
      status: 'active',
      createdAt: new Date(),
    }));

    // Update execution state for parallel processing
    executionState.parallelPaths = parallelPaths;
    executionState.currentNodeId = null; // No single current node when in parallel
    executionState.lastActionAt = new Date();

    // Add history entries for entering parallel paths
    for (const path of parallelPaths) {
      const targetNode = workflow.nodes.find((node: IWorkflowNode) => node.id === path.nodeId);
      if (targetNode) {
        executionState.history.push({
          nodeId: targetNode.id,
          nodeType: targetNode.type,
          action: 'entered',
          timestamp: new Date(),
        });
      }
    }

    await executionState.save();

    // Send notifications to users who need to approve at the target nodes
    for (const path of parallelPaths) {
      const targetNode = workflow.nodes.find((node: IWorkflowNode) => node.id === path.nodeId);
      if (targetNode && targetNode.type === 'approval' && targetNode.data.roleId) {
        try {
          // Find all users assigned to the role for the target approval node
          const roleAssignments = await UserRoleAssignment.find({
            roleId: targetNode.data.roleId,
            companyId: executionState.companyId,
          }).populate('userId');

          if (roleAssignments.length > 0) {
            // Get request details for notification
            const request = await Request.findById(executionState.requestId);
            if (request) {
              // Send notifications to all assigned users
              for (const assignment of roleAssignments) {
                const user = assignment.userId as any;
                if (user && user.email) {
                  await notifyApprovalPending({
                    requestId: executionState.requestId,
                    userId: user._id.toString(),
                    userEmail: user.email,
                    userName: user.name,
                    requestTitle: request.title,
                    workflowNodeLabel: targetNode.label || 'Approval Required',
                    companyName: executionState.companyId.toString(),
                  });
                }
              }
            }
          }
        } catch (notificationError) {
          console.error('Failed to send notification for Options node:', notificationError);
          // Don't fail the execution if notification fails
        }
      }
    }

    return executionState;
  }
}

// Export a singleton instance
export const workflowExecutionEngine = new WorkflowExecutionEngine();
