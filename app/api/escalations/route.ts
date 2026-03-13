import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import UserRoleAssignment from '../../../models/UserRoleAssignment';
import ExecutionState from '../../../models/ExecutionState';
import WorkflowConfiguration from '../../../models/WorkflowConfiguration';
import { getCurrentUser } from '../../../lib/auth';
import { RequestStatus } from '../../../lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if user is system admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized - Not logged in' }, { status: 401 });
    }
    
    // Check if role exists and has isSystemAdmin property
    if (!currentUser.role || !currentUser.role.isSystemAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Find requests that have been stuck for more than 3 days (72 hours)
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    
    const escalatedRequests = await Request.find({
      status: { 
        $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED] 
      },
      updatedAt: { $lt: threeDaysAgo }
    })
    .populate('requester', 'name email empId')
    .populate('company', 'name')
    .sort({ updatedAt: 1 }); // Oldest first

    // Get additional details for each request
    const requestsWithDetails = await Promise.all(
      escalatedRequests.map(async (req) => {
        let currentApprover = null;
        let workflowDetails = null;

        // For custom workflow requests
        if (req.workflowExecutionId) {
          try {
            const execution = await ExecutionState.findById(req.workflowExecutionId);
            if (execution) {
              const workflow = await WorkflowConfiguration.findById(execution.workflowId);
              if (workflow) {
                const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
                if (currentNode && currentNode.data?.roleId) {
                  // Find users with this role through UserRoleAssignment
                  const roleAssignments = await UserRoleAssignment.find({
                    roleId: currentNode.data.roleId,
                    companyId: req.company
                  }).select('userId');
                  
                  const userIds = roleAssignments.map(ra => ra.userId);
                  
                  const approvers = await User.find({
                    _id: { $in: userIds },
                    isActive: true
                  }).select('name email empId');
                  
                  currentApprover = approvers[0] || null;
                  workflowDetails = {
                    currentNodeName: currentNode.data?.label || currentNode.type,
                    workflowName: workflow.name
                  };
                }
              }
            }
          } catch (error) {
            console.error('Error fetching workflow details:', error);
          }
        }

        // Calculate days stuck
        const daysStuck = Math.floor((Date.now() - new Date(req.updatedAt).getTime()) / (24 * 60 * 60 * 1000));

        return {
          _id: req._id,
          requestId: req.requestId,
          title: req.title,
          status: req.status,
          requester: req.requester,
          company: req.company,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          daysStuck,
          currentApprover,
          workflowDetails,
          costEstimate: req.costEstimate,
          expenseCategory: req.expenseCategory
        };
      })
    );

    return NextResponse.json({
      success: true,
      requests: requestsWithDetails,
      count: requestsWithDetails.length
    });

  } catch (error) {
    console.error('Error fetching escalated requests:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch escalated requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}