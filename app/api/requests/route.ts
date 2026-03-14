import { NextRequest, NextResponse } from 'next/server';
import User from '../../../models/User';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import AuditLog from '../../../models/AuditLog';
import { getCurrentUser } from '../../../lib/auth';
import { CreateRequestSchema } from '../../../lib/types';
import { RequestStatus, ActionType } from '../../../lib/types';
import { generateRequestId } from '../../../lib/id-generator';
import mongoose from 'mongoose';
import { notifyApprovalPending } from '../../../lib/notification-service';
import WorkflowConfiguration from '../../../models/WorkflowConfiguration';
import { workflowExecutionEngine } from '../../../lib/workflow-execution-engine';
import ExecutionState from '../../../models/ExecutionState';
import UserRoleAssignment from '../../../models/UserRoleAssignment';
import UserGroupAssignment from '../../../models/UserGroupAssignment';
import CustomRole from '../../../models/CustomRole';

// Helper function to extract company ID from populated or non-populated company field
function getCompanyId(company: any): string {
  if (typeof company === 'object' && company._id) {
    return company._id.toString();
  }
  return company.toString();
}

// Helper function to filter requests with custom workflow support
async function filterRequestsWithCustomWorkflow(
  requests: any[],
  userRoleName: string,
  userId: string,
  permissions: any
): Promise<any[]> {
  // System Admins can see everything
  if (permissions?.isSystemAdmin) {
    return requests.map(req => ({
      ...req,
      _visibility: {
        canSee: true,
        category: req.status === RequestStatus.APPROVED ? 'approved' : 
                  req.status === RequestStatus.REJECTED ? 'completed' : 'in_progress',
        reason: 'System Administrator Access'
      }
    }));
  }

  // Users with ONLY canCreate see only their own requests
  // Users with canView, canForward, or canApprove can see requests assigned to them
  const isOnlyRequester = permissions?.canCreate && 
                         !permissions?.canView && 
                         !permissions?.canForward && 
                         !permissions?.canApprove;
  
  if (isOnlyRequester) {
    return requests
      .filter(req => req.requester._id?.toString() === userId || req.requester.toString() === userId)
      .map(req => ({
        ...req,
        _visibility: {
          canSee: true,
          category: req.status === RequestStatus.APPROVED ? 'approved' : 
                    req.status === RequestStatus.REJECTED ? 'completed' : 'pending',
          reason: 'Own request'
        }
      }));
  }

  // Users with canView or canForward can see requests they're assigned to in the workflow
  if (permissions?.canView || permissions?.canForward) {
    // These users should see requests where they're assigned in the workflow
    // Continue to workflow-based filtering below
  }

  // For approvers: check custom workflow requests
  const customWorkflowRequests = requests.filter(r => r.useCustomWorkflow && r.workflowExecutionId);
  
  if (customWorkflowRequests.length === 0) {
    return [];
  }

  // Get user's role assignments to check against workflow nodes
  const userRoleAssignments = await UserRoleAssignment.find({
    userId: new mongoose.Types.ObjectId(userId)
  }).lean();

  const userRoleIds = userRoleAssignments.map(assignment => assignment.roleId.toString());

  // Also get the user's primary role ID from their User record
  const dbUser = await User.findById(userId);
  const primaryRoleId = dbUser?.role?.toString();
  
  // Combine custom role assignments with primary role
  const allUserRoleIds = [...userRoleIds];
  if (primaryRoleId) {
    allUserRoleIds.push(primaryRoleId);
  }

  console.log('[DEBUG] User role assignments:', {
    userId,
    userRoleIds,
    primaryRoleId,
    allUserRoleIds,
    userRoleName
  });

  // Get execution states for custom workflow requests
  const executionIds = customWorkflowRequests.map(r => r.workflowExecutionId).filter(Boolean);
  const executions = await ExecutionState.find({ _id: { $in: executionIds } });
  
  // Get workflows to check current nodes
  const workflowIds = [...new Set(executions.map(e => e.workflowId))];
  const workflows = await WorkflowConfiguration.find({ _id: { $in: workflowIds } });
  
  // Get user's group memberships once (for efficiency)
  const userGroupAssignments = await UserGroupAssignment.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  const userGroupIds = userGroupAssignments.map((a: any) => a.groupId.toString());
  
  console.log('[DEBUG] User group memberships for filtering:', {
    userId,
    userGroupCount: userGroupIds.length,
    userGroupIds
  });
  
  // Check which custom workflow requests the user should see
  const visibleCustomRequests = await Promise.all(customWorkflowRequests.map(async (request) => {
    // First check: Is the user the requester? If yes, they should always see their own request
    const isRequester = request.requester._id?.toString() === userId || request.requester.toString() === userId;
    
    if (isRequester) {
      console.log('[DEBUG] Request visible - user is requester:', request._id);
      let category = 'pending';
      if (request.status === RequestStatus.APPROVED) {
        category = 'approved';
      } else if (request.status === RequestStatus.REJECTED) {
        category = 'completed';
      }
      
      return {
        ...request,
        _visibility: {
          canSee: true,
          category,
          reason: 'Own request'
        }
      };
    }
    
    const execution = executions.find(e => e._id.toString() === request.workflowExecutionId?.toString());
    if (!execution) {
      console.log('[DEBUG] No execution found for request:', request._id);
      return null;
    }
    
    const workflow = workflows.find(w => w._id.toString() === execution.workflowId.toString());
    if (!workflow) {
      console.log('[DEBUG] No workflow found for execution:', execution._id);
      return null;
    }
    
    console.log('[DEBUG] Checking request visibility:', {
      requestId: request._id,
      requestTitle: request.title,
      executionStatus: execution.status,
      currentNodeId: execution.currentNodeId,
      requesterGroupCount: execution.requesterGroupIds?.length || 0,
      requesterGroupIds: execution.requesterGroupIds?.map((id: any) => id.toString()) || []
    });
    
    // Check if user has interacted with this request in the history
    const userHistoryEntry = execution.history.find((entry: any) => 
      entry.userId?.toString() === userId && 
      (entry.action === 'approved' || entry.action === 'rejected')
    );
    
    // Check if user is the current approver
    const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
    const nodeRoleId = currentNode?.data?.roleId?.toString();
    let isCurrentApprover = currentNode?.type === 'approval' && nodeRoleId && allUserRoleIds.includes(nodeRoleId);
    
    // Also check parallel paths - user might be an approver in one of the parallel branches
    let isParallelApprover = false;
    if (execution.parallelPaths && execution.parallelPaths.length > 0) {
      for (const path of execution.parallelPaths) {
        if (path.status === 'active') {
          const pathNode = workflow.nodes.find((n: any) => n.id === path.currentNodeId);
          if (pathNode && pathNode.type === 'approval' && pathNode.data?.roleId) {
            const pathRoleId = pathNode.data.roleId.toString();
            if (allUserRoleIds.includes(pathRoleId)) {
              isParallelApprover = true;
              
              // Check group scope for parallel path node
              if (pathNode.data.groupScope?.enabled && pathNode.data.groupScope.groupIds?.length > 0) {
                const requesterGroupIds = execution.requesterGroupIds.map((id: any) => id.toString());
                const requiredGroupIds = pathNode.data.groupScope.groupIds.map((id: any) => id.toString());
                const matchType = pathNode.data.groupScope.matchType || 'any';
                
                let hasGroupMatch = false;
                if (matchType === 'any') {
                  hasGroupMatch = userGroupIds.some(groupId => 
                    requiredGroupIds.includes(groupId) && requesterGroupIds.includes(groupId)
                  );
                } else if (matchType === 'all') {
                  const requiredAndRequesterGroups = requiredGroupIds.filter((g: string) => requesterGroupIds.includes(g));
                  hasGroupMatch = requiredAndRequesterGroups.length > 0 && 
                                 requiredAndRequesterGroups.every((groupId: string) => userGroupIds.includes(groupId));
                }
                
                isParallelApprover = hasGroupMatch;
              }
              
              if (isParallelApprover) break;
            }
          }
        }
      }
    }
    
    console.log('[DEBUG] Current node check:', {
      requestId: request._id,
      currentNodeId: execution.currentNodeId,
      currentNodeLabel: currentNode?.label,
      currentNodeType: currentNode?.type,
      nodeRoleId,
      userRoleIds: allUserRoleIds,
      isCurrentApproverByRole: isCurrentApprover,
      isParallelApprover,
      parallelPathCount: execution.parallelPaths?.length || 0,
      hasGroupScope: currentNode?.data?.groupScope?.enabled
    });
    
    // If node has group scope enabled, also check if user is in matching groups
    if (isCurrentApprover && currentNode?.data?.groupScope?.enabled && currentNode?.data?.groupScope?.groupIds?.length > 0) {
      // Get requester's group memberships from execution state
      const requesterGroupIds = execution.requesterGroupIds.map((id: any) => id.toString());
      const requiredGroupIds = currentNode.data.groupScope.groupIds.map((id: any) => id.toString());
      const matchType = currentNode.data.groupScope.matchType || 'any';
      
      console.log('[DEBUG] Group scope filtering:', {
        requestId: request._id,
        userId,
        userGroupIds,
        requesterGroupIds,
        requiredGroupIds,
        matchType
      });
      
      // Check if user matches the group criteria
      let hasGroupMatch = false;
      if (matchType === 'any') {
        // User must be in at least one group that matches requester's groups AND is in required groups
        hasGroupMatch = userGroupIds.some(groupId => 
          requiredGroupIds.includes(groupId) && requesterGroupIds.includes(groupId)
        );
      } else if (matchType === 'all') {
        // User must be in ALL required groups that the requester is also in
        const requiredAndRequesterGroups = requiredGroupIds.filter((g: string) => requesterGroupIds.includes(g));
        hasGroupMatch = requiredAndRequesterGroups.length > 0 && 
                       requiredAndRequesterGroups.every((groupId: string) => userGroupIds.includes(groupId));
      }
      
      console.log('[DEBUG] Group match result:', { hasGroupMatch, isCurrentApprover: hasGroupMatch });
      
      // Override isCurrentApprover based on group match
      isCurrentApprover = hasGroupMatch;
    }
    
    // Check if user's role is assigned to ANY node in the workflow (for forwarders/viewers)
    const isAssignedToWorkflow = workflow.nodes.some((node: any) => 
      node.type === 'approval' && 
      node.data?.roleId && 
      allUserRoleIds.includes(node.data.roleId.toString())
    );
    
    // User can see the request if they're the current approver OR if they've interacted with it before
    // For forwarders: only show if they're the current approver (not just assigned to workflow)
    if (isCurrentApprover || isParallelApprover) {
      console.log('[DEBUG] Request visible - user is current approver:', request._id);
      return {
        ...request,
        _visibility: {
          canSee: true,
          category: 'pending',
          reason: isParallelApprover ? 'Current approver in parallel branch' : 'Current approver in custom workflow'
        }
      };
    } else if (userHistoryEntry) {
      // User has already interacted with this request
      let category = 'in_progress';
      if (request.status === RequestStatus.APPROVED) {
        category = 'approved';
      } else if (request.status === RequestStatus.REJECTED) {
        category = 'completed';
      } else if (userHistoryEntry.action === 'approved') {
        category = 'approved'; // User approved it, even if workflow is still in progress
      }
      
      return {
        ...request,
        _visibility: {
          canSee: true,
          category,
          reason: `Previously ${userHistoryEntry.action} by user`
        }
      };
    }
    
    console.log('[DEBUG] Request NOT visible - no match:', {
      requestId: request._id,
      isCurrentApprover,
      isParallelApprover,
      hasHistoryEntry: !!userHistoryEntry
    });
    
    return null;
  }));
  
  // Filter out null entries
  const filteredRequests = visibleCustomRequests.filter(Boolean);

  console.log('[DEBUG] Visible custom workflow requests:', filteredRequests.length);

  return filteredRequests;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 0; // default 0 = return all
    const statusFilter = searchParams.get('status'); // Renamed for clarity
    const college = searchParams.get('college');
    const pendingApprovals = searchParams.get('pendingApprovals') === 'true';

    console.log('[DEBUG] Requests API called:', {
      userId: user.id,
      userRole: user.role,
      statusFilter,
      page,
      limit
    });

    let filter: any = {};

    // Get user's database record for proper filtering
    let dbUser = null;
    if (mongoose.Types.ObjectId.isValid(user.id)) {
      dbUser = await User.findById(user.id);
    } else {
      dbUser = await User.findOne({ email: user.email });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoleName = user.role.name;
    const permissions = {
      ...user.role.permissions,
      isSystemAdmin: user.role.isSystemAdmin
    };

    // Permission-based filtering: Users with ONLY canCreate see only their requests
    // Users with canView, canForward, or canApprove can see requests assigned to them
    const isOnlyRequester = permissions.canCreate && 
                           !permissions.canView && 
                           !permissions.canForward && 
                           !permissions.canApprove && 
                           !permissions.isSystemAdmin;
    
    let baseQuery: any = {};
    
    if (isOnlyRequester) {
      // Users with ONLY canCreate permission can only see their own requests
      baseQuery.requester = dbUser._id;
    }
    // Approvers, forwarders, viewers, and admins see all requests (no additional filter)

    // Apply basic filters
    if (college) {
      baseQuery.college = college;
    }

    const allRequests = await Request.find(baseQuery)
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(); // Convert to plain objects for better performance

    console.log('[DEBUG] Total requests fetched:', allRequests.length);
    console.log('[DEBUG] Request details:', allRequests.map(r => ({
      id: r._id,
      title: r.title,
      status: r.status,
      useCustomWorkflow: r.useCustomWorkflow,
      workflowExecutionId: r.workflowExecutionId
    })));

    // Apply custom workflow visibility filtering
    let visibleRequests = await filterRequestsWithCustomWorkflow(
      allRequests,
      userRoleName,
      dbUser._id.toString(),
      permissions
    );

    console.log('[DEBUG] Requests after visibility filtering:', visibleRequests.length);

    // Apply status filtering based on the URL query parameter
    if (statusFilter) {
      console.log('[DEBUG] Applying status filter:', statusFilter);

      if (statusFilter === 'pending') {
        // For both requesters and approvers: use visibility category
        visibleRequests = visibleRequests.filter(req => req._visibility?.category === 'pending');
      } else if (statusFilter === 'approved') {
        if (permissions.canCreate) {
          // For users with canCreate: show only requests that have been fully approved by Chairman
          visibleRequests = visibleRequests.filter(req => req.status === RequestStatus.APPROVED);
        } else {
          // For approvers: show requests that they have approved (regardless of current status)
          visibleRequests = visibleRequests.filter(req => req._visibility?.category === 'approved');
        }
      } else if (statusFilter === 'rejected') {
        // Show requests that are rejected OR were rejected with query
        visibleRequests = visibleRequests.filter(req => {
          // Include requests with status REJECTED
          if (req.status === RequestStatus.REJECTED) return true;

          // Also include requests that were rejected with query (even if status changed)
          const wasRejectedWithClarification = req.history?.some((h: any) =>
            h.action === ActionType.REJECT_WITH_CLARIFICATION
          );

          return wasRejectedWithClarification;
        });
      } else if (statusFilter === 'all') {
        // Show all visible requests (no additional filtering)
        // visibleRequests already contains all visible requests
      } else {
        // Filter by specific status
        visibleRequests = visibleRequests.filter(req => req.status === statusFilter);
      }

      console.log('[DEBUG] Requests after status filter:', visibleRequests.length);
    }

    // Apply pagination
    const shouldPaginate = limit > 0;
    const skip = shouldPaginate ? (page - 1) * limit : 0;
    const sliceEnd = shouldPaginate ? skip + limit : undefined;
    const filteredRequests = visibleRequests.slice(skip, sliceEnd);
    const total = visibleRequests.length;

    console.log('[DEBUG] Returning', filteredRequests.length, 'requests after pagination');
    console.log('[DEBUG] Total visible requests before pagination:', visibleRequests.length);
    console.log('[DEBUG] Request titles:', filteredRequests.map(r => r.title));

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit: shouldPaginate ? limit : total,
        total,
        pages: shouldPaginate ? Math.ceil(total / limit) : 1,
      },
      filter: statusFilter || 'all' // Include active filter in response
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({
      error: 'Failed to fetch requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user || !user.role.permissions.canCreate) {
      // Log security violation attempt
      console.warn(`Unauthorized request creation attempt by user ${user?.email || 'unknown'} with role ${user?.role?.name || 'unknown'}`);

      // Log to audit trail if user exists
      if (user) {
        await AuditLog.create({
          action: 'unauthorized_request_creation_attempt',
          userId: user.id,
          targetType: 'user',
          targetId: user.id,
          details: {
            userRole: user.role.name,
            userEmail: user.email,
            reason: 'User does not have canCreate permission',
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
          },
        });
      }

      const statusCode = user ? 403 : 401;
      const errorMessage = user ? 'Forbidden: You do not have permission to create requests' : 'Unauthorized: Authentication required';

      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const body = await request.json();
    const validatedData = CreateRequestSchema.parse(body);

    // Find the requester user (should already exist from authentication)
    const requesterUser = await User.findOne({ email: user!.email });
    if (!requesterUser) {
      return NextResponse.json({ error: 'User not found. Please ensure you are properly authenticated.' }, { status: 404 });
    }

    // Generate unique 6-digit request ID
    const requestId = await generateRequestId();

    // Check if company has an active custom workflow
    let useCustomWorkflow = false;
    let workflowExecutionId = null;
    let initialStatus = RequestStatus.SUBMITTED;
    let initialNotes = 'Request created';

    console.log('[DEBUG] Checking for active workflow for company:', requesterUser.company);

    if (!requesterUser.company) {
      return NextResponse.json({ 
        error: 'Company not found. User must be associated with a company to create requests.' 
      }, { status: 400 });
    }

    const activeWorkflow = await WorkflowConfiguration.findOne({
      companyId: getCompanyId(requesterUser.company),
      isActive: true,
    });

    console.log('[DEBUG] Active workflow found:', activeWorkflow ? {
      id: activeWorkflow._id,
      name: activeWorkflow.name,
      isActive: activeWorkflow.isActive,
      nodeCount: activeWorkflow.nodes.length
    } : 'none');

    if (!activeWorkflow) {
      return NextResponse.json({ 
        error: 'No active workflow found. Please activate a workflow before creating requests.' 
      }, { status: 400 });
    }

    // Custom workflow exists - initialize workflow execution
    try {
      const companyId = getCompanyId(requesterUser.company);
      
      const executionState = await workflowExecutionEngine.initializeExecution(
        requestId,
        activeWorkflow._id.toString(),
        companyId,
        requesterUser._id.toString()
      );

      useCustomWorkflow = true;
      workflowExecutionId = executionState._id;
      initialStatus = RequestStatus.SUBMITTED;
      initialNotes = 'Request created and custom workflow initialized';

      console.log('[DEBUG] Custom workflow initialized:', {
        requestId,
        workflowId: activeWorkflow._id,
        executionId: executionState._id,
        currentNode: executionState.currentNodeId
      });

      // The initializeExecution already handles skipping requester nodes and sending notifications
      // No need for duplicate logic here
      
    } catch (workflowError) {
      console.error('[ERROR] Failed to initialize custom workflow:', workflowError);
      return NextResponse.json({ 
        error: 'Failed to initialize workflow',
        details: workflowError instanceof Error ? workflowError.message : 'Unknown error'
      }, { status: 500 });
    }

    const newRequest = await Request.create({
      requestId,
      ...validatedData,
      requester: requesterUser._id,
      status: initialStatus,
      useCustomWorkflow,
      workflowExecutionId,
      history: [{
        action: ActionType.CREATE,
        actor: requesterUser._id,
        timestamp: new Date(),
        notes: initialNotes,
        newStatus: initialStatus,
      }],
    });

    // Log audit
    await AuditLog.create({
      action: 'request_create',
      userId: requesterUser._id,
      targetType: 'request',
      targetId: newRequest._id,
      details: { requestData: validatedData },
    });

    const populatedRequest = await Request.findById(newRequest._id)
      .populate('requester', 'name email empId');

    console.log('[DEBUG] Request created successfully:', {
      requestId: newRequest._id,
      title: validatedData.title,
      requester: user!.email,
      useCustomWorkflow,
    });

    // Send notifications to next approvers
    if (useCustomWorkflow && workflowExecutionId) {
      // For custom workflows, find users assigned to the current node
      try {
        const executionState = await ExecutionState.findById(workflowExecutionId);
        if (executionState && executionState.currentNodeId) {
          const activeWorkflow = await WorkflowConfiguration.findById(executionState.workflowId);
          if (activeWorkflow) {
            const currentNode = activeWorkflow.nodes.find((n: any) => n.id === executionState.currentNodeId);
            if (currentNode && currentNode.type === 'approval' && currentNode.data?.roleId) {
              console.log('[DEBUG] Looking for users with roleId:', currentNode.data.roleId, 'in company:', getCompanyId(requesterUser.company));
              
              // Find users with this role in the company
              const roleAssignments = await UserRoleAssignment.find({
                companyId: getCompanyId(requesterUser.company),
                roleId: currentNode.data.roleId
              }).populate('userId');
              
              console.log('[DEBUG] Found', roleAssignments.length, 'users for role:', currentNode.label);
              
              for (const assignment of roleAssignments) {
                if (assignment.userId) {
                  console.log('[DEBUG] Sending notification to user:', assignment.userId._id);
                  await notifyApprovalPending(
                    assignment.userId._id.toString(),
                    newRequest._id.toString(),
                    validatedData.title,
                    requesterUser.name
                  );
                }
              }
            } else {
              console.log('[DEBUG] Current node is not an approval node or missing roleId:', {
                nodeType: currentNode?.type,
                hasRoleId: !!currentNode?.data?.roleId
              });
            }
          }
        }
      } catch (notificationError) {
        console.error('[ERROR] Failed to send custom workflow notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

    return NextResponse.json(populatedRequest, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({
      error: 'Failed to create request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}