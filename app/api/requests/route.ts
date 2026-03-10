import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
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

  // Users with canCreate see only their own requests
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

  // For approvers: check custom workflow requests
  const customWorkflowRequests = requests.filter(r => r.useCustomWorkflow && r.workflowExecutionId);
  
  if (customWorkflowRequests.length === 0) {
    return [];
  }

  // Get execution states for custom workflow requests
  const executionIds = customWorkflowRequests.map(r => r.workflowExecutionId).filter(Boolean);
  const executions = await ExecutionState.find({ _id: { $in: executionIds } });
  
  // Get workflows to check current nodes
  const workflowIds = [...new Set(executions.map(e => e.workflowId))];
  const workflows = await WorkflowConfiguration.find({ _id: { $in: workflowIds } });
  
  // Check which custom workflow requests the user should see
  const visibleCustomRequests = customWorkflowRequests.filter(request => {
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

  // Add visibility metadata
  return visibleCustomRequests.map(req => ({
    ...req,
    _visibility: {
      canSee: true,
      category: 'pending',
      reason: 'Current approver in custom workflow'
    }
  }));
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
      dbUser = await User.findById(user.id).populate('role');
    } else {
      dbUser = await User.findOne({ email: user.email }).populate('role');
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoleName = user.role.name;
    const permissions = {
      ...user.role.permissions,
      isSystemAdmin: user.role.isSystemAdmin
    };

    // Permission-based filtering: Users with canCreate see only their requests
    const hasCanCreate = permissions.canCreate && !permissions.isSystemAdmin;
    
    let baseQuery: any = {};
    
    if (hasCanCreate) {
      // Users with canCreate permission can only see their own requests
      baseQuery.requester = dbUser._id;
    }
    // Approvers and admins see all requests (no additional filter)

    // Apply basic filters
    if (college) {
      baseQuery.college = college;
    }

    const allRequests = await Request.find(baseQuery)
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role')
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
        if (hasCanCreate) {
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
    const requesterUser = await User.findOne({ email: user!.email }).populate('company');
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
        companyId
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

      // Advance to the first approval node automatically
      try {
        // Find the start node
        const startNode = activeWorkflow.nodes.find((n: any) => n.type === 'start');
        if (startNode) {
          // Find the edge from start node
          const nextEdge = activeWorkflow.edges.find((e: any) => e.source === startNode.id);
          if (nextEdge) {
            const nextNode = activeWorkflow.nodes.find((n: any) => n.id === nextEdge.target);
            
            // Skip requester nodes and advance to first actual approver
            let currentEdge = nextEdge;
            let currentNode = nextNode;
            
            while (currentNode && currentNode.type === 'approval') {
              const nodeName = currentNode.label || currentNode.data?.label || '';
              const isRequesterNode = nodeName.toLowerCase().includes('requester') || 
                                     nodeName.toLowerCase().includes('creator');
              
              if (!isRequesterNode) {
                // Found the first actual approver node
                executionState.currentNodeId = currentNode.id;
                executionState.history.push({
                  nodeId: currentNode.id,
                  nodeType: currentNode.type,
                  action: 'entered',
                  timestamp: new Date(),
                });
                await executionState.save();
                
                console.log('[DEBUG] Advanced to first approver node:', {
                  nodeId: currentNode.id,
                  nodeName: nodeName
                });
                break;
              }
              
              // Skip this requester node and move to next
              const skipEdge = activeWorkflow.edges.find((e: any) => e.source === currentNode.id);
              if (!skipEdge) break;
              
              currentNode = activeWorkflow.nodes.find((n: any) => n.id === skipEdge.target);
            }
          }
        }
      } catch (advanceError) {
        console.error('[ERROR] Failed to advance to first approver:', advanceError);
        // Continue anyway - the workflow can still function
      }
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
            if (currentNode && currentNode.type === 'approval') {
              const roleName = currentNode.label || currentNode.data?.label;
              
              console.log('[DEBUG] Looking for users with role:', roleName, 'in company:', getCompanyId(requesterUser.company));
              
              // First, find the role by name
              const CustomRole = (await import('../../../models/CustomRole')).default;
              const role = await CustomRole.findOne({
                name: roleName,
                companyId: getCompanyId(requesterUser.company)
              });
              
              if (!role) {
                console.error('[ERROR] Role not found:', roleName);
              } else {
                console.log('[DEBUG] Found role:', role.name, 'with ID:', role._id);
                
                // Find users with this role in the company
                const roleAssignments = await UserRoleAssignment.find({
                  companyId: getCompanyId(requesterUser.company),
                  roleId: role._id
                }).populate('userId');
                
                console.log('[DEBUG] Found', roleAssignments.length, 'users for role:', roleName);
                
                for (const assignment of roleAssignments) {
                  if (assignment.userId) {
                    console.log('[DEBUG] Sending notification to user:', assignment.userId);
                    await notifyApprovalPending(
                      assignment.userId.toString(),
                      newRequest._id.toString(),
                      validatedData.title,
                      requesterUser.name
                    );
                  }
                }
              }
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