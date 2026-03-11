import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import { getCurrentUser } from '../../../lib/auth';
import { RequestStatus } from '../../../lib/types';
import mongoose from 'mongoose';
import ExecutionState from '../../../models/ExecutionState';
import WorkflowConfiguration from '../../../models/WorkflowConfiguration';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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

  // Users with canCreate see only their own requests (shouldn't be here but handle it)
  if (permissions?.canCreate) {
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
  
  // Check which custom workflow requests the user should see
  const visibleRequests = requests.map(request => {
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
    
    // Check if user has interacted with this request in the history
    const userHistoryEntry = execution.history.find((entry: any) => 
      entry.userId?.toString() === userId && 
      (entry.action === 'approved' || entry.action === 'rejected' || entry.action === 'forwarded')
    );
    
    // Check if user is the current approver
    const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
    const nodeRoleId = currentNode?.data?.roleId?.toString();
    const isCurrentApprover = currentNode?.type === 'approval' && nodeRoleId && allUserRoleIds.includes(nodeRoleId);
    
    // Check if user's role is assigned to ANY node in the workflow (for forwarders/viewers)
    const isAssignedToWorkflow = workflow.nodes.some((node: any) => 
      node.type === 'approval' && 
      node.data?.roleId && 
      allUserRoleIds.includes(node.data.roleId.toString())
    );
    
    // User can see the request if they're the current approver OR if they've interacted with it before
    // For forwarders: only show if they're the current approver (not just assigned to workflow)
    if (isCurrentApprover) {
      return {
        ...request,
        _visibility: {
          canSee: true,
          category: 'pending',
          reason: 'Current approver in custom workflow'
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
  }).filter(Boolean); // Remove null entries

  console.log('[DEBUG] Visible requests after filtering:', visibleRequests.length);
  
  return visibleRequests;
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG] Approvals API called');
  try {
    await connectDB();
    const user = await getCurrentUser();

    console.log('[DEBUG] Current user:', user ? { id: user.id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('[DEBUG] No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name;
    const permissions = {
      ...user.role.permissions,
      isSystemAdmin: user.role.isSystemAdmin
    };

    // Requesters don't have pending approvals to process (but System Admins can access)
    if (permissions.canCreate && !permissions.isSystemAdmin) {
      console.log('[DEBUG] User is requester, redirecting to requests');
      return NextResponse.json({
        error: 'Requesters should use /api/requests endpoint',
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status'); // Get status filter from query

    console.log('[DEBUG] Query params:', { page, limit, statusFilter });

    // Get user's database record with role populated
    let dbUser = null;
    if (mongoose.Types.ObjectId.isValid(user.id)) {
      dbUser = await User.findById(user.id).populate('role');
    } else {
      dbUser = await User.findOne({ email: user.email }).populate('role');
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's role assignments to check against workflow nodes
    const UserRoleAssignment = (await import('../../../models/UserRoleAssignment')).default;
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

    console.log('[DEBUG] User role assignments:', {
      userId: dbUser._id.toString(),
      userRoleIds,
      primaryRoleId,
      allUserRoleIds,
      userRoleName: dbUser.role.name
    });

    // Get all requests and apply sophisticated visibility filtering
    const allRequests = await Request.find({})
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role')
      .sort({ updatedAt: -1 })
      .lean(); // Convert to plain objects

    console.log('[DEBUG] Total requests in system:', allRequests.length);

    // All requests should be custom workflow requests now
    const customWorkflowRequests = allRequests.filter(r => r.useCustomWorkflow && r.workflowExecutionId);
    const nonWorkflowRequests = allRequests.filter(r => !r.useCustomWorkflow || !r.workflowExecutionId);
    
    console.log('[DEBUG] Custom workflow requests:', customWorkflowRequests.length);
    if (nonWorkflowRequests.length > 0) {
      console.warn('[WARN] Found', nonWorkflowRequests.length, 'requests without custom workflow - these should not exist');
    }

    // Apply custom workflow filtering
    const visibleRequests = await filterCustomWorkflowRequests(
      customWorkflowRequests,
      dbUser.role.name,
      dbUser._id.toString(),
      permissions,
      allUserRoleIds
    );

    console.log('[DEBUG] Visible requests after filtering:', visibleRequests.length);

    // Determine visibility mode based on status filter
    let filteredRequests: any[] = [];

    if (statusFilter === 'approved') {
      // Show all requests that the user has approved
      filteredRequests = visibleRequests.filter(req => req._visibility?.category === 'approved');
      console.log('[DEBUG] Filtered to user-approved requests:', filteredRequests.length);
    } else if (statusFilter === 'rejected') {
      // Show rejected requests
      filteredRequests = visibleRequests.filter(req => req._visibility?.category === 'completed' && req.status === RequestStatus.REJECTED);
    } else if (statusFilter === 'in_progress') {
      filteredRequests = visibleRequests.filter(req => req._visibility?.category === 'in_progress');
    } else if (statusFilter === 'all') {
      filteredRequests = visibleRequests;
    } else {
      // Default: show only pending approvals
      filteredRequests = visibleRequests.filter(req => req._visibility?.category === 'pending');
    }

    // Debug: Show visibility analysis for custom workflow requests
    if (customWorkflowRequests.length > 0 && !statusFilter) {
      console.log('[DEBUG] Custom workflow requests visibility analysis:');
      for (const req of customWorkflowRequests.slice(0, 3)) { // Only show first 3 for brevity
        if (req.workflowExecutionId) {
          const execution = await ExecutionState.findById(req.workflowExecutionId);
          const workflow = execution ? await WorkflowConfiguration.findById(execution.workflowId) : null;
          const currentNode = workflow?.nodes.find((n: any) => n.id === execution?.currentNodeId);
          
          console.log(`[DEBUG] Request ${req._id}:`);
          console.log(`  - useCustomWorkflow=${req.useCustomWorkflow}`);
          console.log(`  - workflowExecutionId=${req.workflowExecutionId}`);
          console.log(`  - currentNodeId=${execution?.currentNodeId}`);
          console.log(`  - currentNodeLabel=${currentNode?.label || currentNode?.data?.label}`);
          console.log(`  - userRoleName=${dbUser.role?.name || 'unknown'}`);
          console.log(`  - matches=${(currentNode?.label || currentNode?.data?.label) === (dbUser.role?.name || 'unknown')}`);
        }
      }
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedRequests = filteredRequests.slice(skip, skip + limit);
    const total = filteredRequests.length;

    console.log('[DEBUG] Returning', paginatedRequests.length, 'requests after pagination');

    return NextResponse.json({
      requests: paginatedRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filter: statusFilter || 'pending' // Include filter info in response
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 });
  }
}