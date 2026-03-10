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

  if (requests.length === 0) return [];

  // Get execution states for custom workflow requests
  const executionIds = requests.map(r => r.workflowExecutionId).filter(Boolean);
  if (executionIds.length === 0) return [];

  const executions = await ExecutionState.find({ _id: { $in: executionIds } });
  
  // Get workflows to check current nodes
  const workflowIds = [...new Set(executions.map(e => e.workflowId))];
  const workflows = await WorkflowConfiguration.find({ _id: { $in: workflowIds } });
  
  // Check which custom workflow requests the user should see
  const visibleRequests = requests.filter(request => {
    const execution = executions.find(e => e._id.toString() === request.workflowExecutionId?.toString());
    if (!execution) {
      console.log('[DEBUG] No execution found for request:', request._id);
      return false;
    }
    
    const workflow = workflows.find(w => w._id.toString() === execution.workflowId.toString());
    if (!workflow) {
      console.log('[DEBUG] No workflow found for execution:', execution._id);
      return false;
    }
    
    const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
    if (!currentNode || currentNode.type !== 'approval') {
      console.log('[DEBUG] Current node not found or not approval type:', execution.currentNodeId, currentNode?.type);
      return false;
    }
    
    // Check if user's role matches the current node's role
    const nodeRoleName = currentNode.label || currentNode.data?.label;
    const matches = nodeRoleName === userRoleName;
    
    console.log('[DEBUG] Role matching for request', request._id, ':', {
      nodeRoleName,
      userRoleName,
      matches,
      currentNodeId: execution.currentNodeId
    });
    
    return matches;
  });

  // Add visibility metadata for consistency
  return visibleRequests.map(req => ({
    ...req,
    _visibility: {
      canSee: true,
      category: 'pending',
      reason: 'Current approver in custom workflow'
    }
  }));
}

// Function to get role-based filter for pending approvals
function getPendingApprovalsFilter(userRole: UserRole, userId: any) {
  let filter: any = {};

  // For now, show all non-completed requests to any non-requester role
  // This will help debug the issue and ensure approvers can see requests
  if (userRole !== UserRole.REQUESTER) {
    filter.status = {
      $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED]
    };
  } else {
    // Requesters should not see any approvals
    filter._id = { $exists: false };
  }

  return filter;
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
      permissions
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