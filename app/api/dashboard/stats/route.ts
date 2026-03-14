import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import User from '../../../../models/User';
import Role from '../../../../models/Role';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../../lib/types';
import mongoose from 'mongoose';
import ExecutionState from '../../../../models/ExecutionState';
import WorkflowConfiguration from '../../../../models/WorkflowConfiguration';
import UserRoleAssignment from '../../../../models/UserRoleAssignment';

// Helper function to filter custom workflow requests
async function filterCustomWorkflowRequests(
  requests: any[],
  userRoleName: string,
  userId: string,
  permissions: any,
  allUserRoleIds: string[]
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

  if (requests.length === 0) return [];

  // Get execution states for custom workflow requests
  const executionIds = requests.map(r => r.workflowExecutionId).filter(Boolean);
  if (executionIds.length === 0) return [];

  const executions = await ExecutionState.find({ _id: { $in: executionIds } });
  
  // Get workflows to check current nodes
  const workflowIds = [...new Set(executions.map(e => e.workflowId))];
  const workflows = await WorkflowConfiguration.find({ _id: { $in: workflowIds } });
  
  // Get user's group memberships once (for efficiency)
  const UserGroupAssignment = (await import('../../../../models/UserGroupAssignment')).default;
  const userGroupAssignments = await UserGroupAssignment.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  const userGroupIds = userGroupAssignments.map((a: any) => a.groupId.toString());
  
  // Check which custom workflow requests the user should see
  const visibleRequests = await Promise.all(requests.map(async (request) => {
    // First check: Is the user the requester? If yes, they should always see their own request
    const isRequester = request.requester._id?.toString() === userId || request.requester.toString() === userId;
    
    if (isRequester) {
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
      return null;
    }
    
    const workflow = workflows.find(w => w._id.toString() === execution.workflowId.toString());
    if (!workflow) {
      return null;
    }
    
    // Check if user has interacted with this request in the history
    const userHistoryEntry = execution.history.find((entry: any) => 
      entry.userId?.toString() === userId && 
      (entry.action === 'approved' || entry.action === 'rejected' || entry.action === 'forwarded')
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
                  const requiredAndRequesterGroups = requiredGroupIds.filter(g => requesterGroupIds.includes(g));
                  hasGroupMatch = requiredAndRequesterGroups.length > 0 && 
                                 requiredAndRequesterGroups.every(groupId => userGroupIds.includes(groupId));
                }
                
                isParallelApprover = hasGroupMatch;
              }
              
              if (isParallelApprover) break;
            }
          }
        }
      }
    }
    
    // If node has group scope enabled, also check if user is in matching groups
    if (isCurrentApprover && currentNode?.data?.groupScope?.enabled && currentNode?.data?.groupScope?.groupIds?.length > 0) {
      const requesterGroupIds = execution.requesterGroupIds.map((id: any) => id.toString());
      const requiredGroupIds = currentNode.data.groupScope.groupIds.map((id: any) => id.toString());
      const matchType = currentNode.data.groupScope.matchType || 'any';
      
      let hasGroupMatch = false;
      if (matchType === 'any') {
        hasGroupMatch = userGroupIds.some(groupId => 
          requiredGroupIds.includes(groupId) && requesterGroupIds.includes(groupId)
        );
      } else if (matchType === 'all') {
        const requiredAndRequesterGroups = requiredGroupIds.filter(g => requesterGroupIds.includes(g));
        hasGroupMatch = requiredAndRequesterGroups.length > 0 && 
                       requiredAndRequesterGroups.every(groupId => userGroupIds.includes(groupId));
      }
      
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
    
    return null;
  }));

  return visibleRequests.filter(Boolean); // Remove null entries
}



export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's database record
    let dbUser = null;
    if (mongoose.Types.ObjectId.isValid(user.id)) {
      dbUser = await User.findById(user.id);
    } else {
      dbUser = await User.findOne({ email: user.email });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's role assignments to check against workflow nodes
    const userRoleAssignments = await UserRoleAssignment.find({
      userId: new mongoose.Types.ObjectId(dbUser._id)
    }).lean();

    const userRoleIds = userRoleAssignments.map((assignment: any) => assignment.roleId.toString());

    // Also get the user's primary role ID from their User record
    const primaryRoleId = dbUser?.role?._id?.toString();
    
    // Combine custom role assignments with primary role
    const allUserRoleIds = [...userRoleIds];
    if (primaryRoleId) {
      allUserRoleIds.push(primaryRoleId);
    }

    // Get all requests and apply sophisticated visibility filtering
    const allRequests = await Request.find({})
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
      .lean(); // Convert to plain objects

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_') as UserRole;
    const permissions = {
      ...user.role.permissions,
      isSystemAdmin: user.role.isSystemAdmin
    };

    let totalRequests: number;
    let visibleRequests: any[];

    // Determine if user is only a requester or has other permissions
    const isOnlyRequester = permissions.canCreate && 
                           !permissions.canView && 
                           !permissions.canForward && 
                           !permissions.canApprove && 
                           !permissions.isSystemAdmin;

    if (isOnlyRequester) {
      // Requesters see only their own requests
      visibleRequests = allRequests.filter(req =>
        req.requester._id?.toString() === dbUser._id.toString() ||
        req.requester.toString() === dbUser._id.toString()
      );
      totalRequests = visibleRequests.length;
    } else {
      // Non-requesters: apply visibility filtering
      visibleRequests = await filterCustomWorkflowRequests(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        permissions,
        allUserRoleIds
      );
      totalRequests = visibleRequests.length;
    }

    console.log('[DEBUG] [STATS] Visible requests:', {
      userId: dbUser._id.toString(),
      isOnlyRequester,
      totalRequests,
      visibleRequestTitles: visibleRequests.map(r => r.title)
    });

    // Calculate other stats
    let pendingRequests: number;
    let approvedRequests: number;
    let rejectedRequests: number;
    let inProgressRequests: number;

    if (isOnlyRequester) {
      // For requesters, use their own requests
      pendingRequests = visibleRequests.filter(req =>
        !['approved', 'rejected'].includes(req.status)
      ).length;

      approvedRequests = visibleRequests.filter(req =>
        req.status === RequestStatus.APPROVED
      ).length;

      rejectedRequests = visibleRequests.filter(req =>
        req.status === RequestStatus.REJECTED
      ).length;

      inProgressRequests = 0;
    } else {
      // For non-requesters, use visibility-filtered requests for all counts
      // This ensures they only see requests that have been at their level
      pendingRequests = visibleRequests.filter(req =>
        req._visibility?.category === 'pending'
      ).length;

      console.log('[DEBUG] [STATS] Pending requests calculation:', {
        visibleCount: visibleRequests.length,
        pendingCount: pendingRequests,
        categories: visibleRequests.map(r => ({ title: r.title, category: r._visibility?.category }))
      });

      // Approved: show requests they have approved (regardless of current status)
      approvedRequests = visibleRequests.filter(req =>
        req._visibility?.category === 'approved'
      ).length;

      // Rejected: show requests they have rejected OR requests they approved but were later rejected by someone else
      rejectedRequests = visibleRequests.filter(req => {
        // Request must be rejected
        if (req.status !== RequestStatus.REJECTED) return false;

        // Check if this user has rejected this request
        const userHasRejected = req.history?.some((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          h.action === ActionType.REJECT
        );

        // Check if this user has approved this request in the history
        const userHasApproved = req.history?.some((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
        );

        // Show if user rejected it OR if user approved it but someone else rejected it later
        return userHasRejected || userHasApproved;
      }).length;

      // In-progress: show requests they've been involved with
      inProgressRequests = visibleRequests.filter(req =>
        req._visibility.category === 'in_progress' &&
        (req._visibility.userAction === 'approve' || req._visibility.userAction === 'clarify')
      ).length;
    }

    return NextResponse.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      inProgressRequests,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}