import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Request from '../../../../../models/Request';
import { getCurrentUser } from '../../../../../lib/auth';
import { RequestStatus, ActionType } from '../../../../../lib/types';
import { notifyStatusChange, notifyApprovalPending } from '../../../../../lib/notification-service';
import { setRenewalDate } from '../../../../../lib/renewal-service';
import { workflowExecutionEngine } from '../../../../../lib/workflow-execution-engine';
import ExecutionState from '../../../../../models/ExecutionState';
import WorkflowConfiguration from '../../../../../models/WorkflowConfiguration';
import UserRoleAssignment from '../../../../../models/UserRoleAssignment';

// Helper function to extract company ID from populated or non-populated company field
function getCompanyId(company: any): string {
  if (typeof company === 'object' && company._id) {
    return company._id.toString();
  }
  return company.toString();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let user: any = null;
  let action: string = '';

  try {
    await connectDB();
    user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      action: requestAction,
      notes,
      signature,
      attachments,
    } = await request.json();

    action = requestAction;

    const permissions = user.role.permissions;

    console.log('[DEBUG] Approval request started:', {
      requestId: params.id,
      userRole: user.role.name,
      userEmail: user.email,
      action
    });

    // Permission check for approval
    if (action === 'approve' && !permissions.canApprove) {
      return NextResponse.json({ error: 'Permission Denied: You do not have approval rights.' }, { status: 403 });
    }

    if (action === 'approve' && permissions.canESign && !signature) {
       return NextResponse.json({ error: 'Signature required for approval' }, { status: 400 });
    }

    // Validate action - only approve, reject, and reject_with_clarification are supported
    if (!['approve', 'reject', 'reject_with_clarification'].includes(action)) {
      console.log('[DEBUG] Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action. Only approve, reject, and reject_with_clarification are supported.' }, { status: 400 });
    }

    const requestRecord = await Request.findById(params.id);

    if (!requestRecord) {
      console.log('[DEBUG] Request not found:', params.id);
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    console.log('[DEBUG] Request found:', {
      requestId: params.id,
      currentStatus: requestRecord.status,
      useCustomWorkflow: requestRecord.useCustomWorkflow,
      workflowExecutionId: requestRecord.workflowExecutionId
    });

    // ========================================
    // CUSTOM WORKFLOW ROUTING (100% Customizable)
    // ========================================
    if (!requestRecord.useCustomWorkflow || !requestRecord.workflowExecutionId) {
      return NextResponse.json(
        {
          error: 'This request does not use a custom workflow. Please ensure all requests are created with an active workflow.',
        },
        { status: 400 }
      );
    }

    console.log('[DEBUG] Routing through custom workflow:', {
      action,
      workflowExecutionId: requestRecord.workflowExecutionId
    });

    // Handle approve and reject actions through workflow engine
    if (action === 'approve' || action === 'reject') {
      try {
        // Map action to workflow engine format
        const workflowAction = action === 'approve' ? 'approved' : 'rejected';

        // Process the action through the workflow execution engine
        const updatedExecutionState = await workflowExecutionEngine.processAction(
          requestRecord.workflowExecutionId.toString(),
          workflowAction,
          user.id,
          notes
        );

        console.log('[DEBUG] Workflow action processed:', {
          executionStatus: updatedExecutionState.status,
          currentNodeId: updatedExecutionState.currentNodeId
        });

        // Update request status based on workflow completion
        let newRequestStatus = requestRecord.status;
        if (updatedExecutionState.status === 'completed') {
          newRequestStatus = RequestStatus.APPROVED;
          console.log('[DEBUG] Workflow completed - marking request as APPROVED');
        } else if (updatedExecutionState.status === 'rejected') {
          newRequestStatus = RequestStatus.REJECTED;
          console.log('[DEBUG] Workflow rejected - marking request as REJECTED');
        }

        // Update the request with new status and add history entry
        const historyEntry: any = {
          action: action === 'approve' ? ActionType.APPROVE : ActionType.REJECT,
          actor: user.id,
          previousStatus: requestRecord.status,
          newStatus: newRequestStatus,
          timestamp: new Date(),
          notes: notes || '',
        };

        if (action === 'approve' && permissions.canESign && signature) {
          historyEntry.signature = signature;
          historyEntry.signatureTimestamp = new Date();
        }

        const updateData: any = {
          $push: { history: historyEntry },
        };

        if (newRequestStatus !== requestRecord.status) {
          updateData.$set = { status: newRequestStatus, lastReminderSent: null };
        }

        const updatedRequest = await Request.findByIdAndUpdate(
          params.id,
          updateData,
          { new: true }
        )
          .populate('requester', 'name email empId role')
          .populate('history.actor', 'name email empId role');

        console.log('[DEBUG] Request updated via custom workflow:', {
          requestId: params.id,
          newStatus: newRequestStatus,
          executionStatus: updatedExecutionState.status
        });

        // Set renewal date if this is a renewal request that was just approved
        if (newRequestStatus === RequestStatus.APPROVED && updatedRequest.requestType === 'renewal') {
          try {
            await setRenewalDate(params.id);
            console.log('[DEBUG] Renewal date set for approved renewal request');
          } catch (renewalError) {
            console.error('[ERROR] Failed to set renewal date:', renewalError);
          }
        }

        // Send notifications to next approver if workflow is still in progress
        if (updatedExecutionState.status === 'in_progress' && updatedExecutionState.currentNodeId) {
          try {
            const activeWorkflow = await WorkflowConfiguration.findById(updatedExecutionState.workflowId);
            if (activeWorkflow) {
              const currentNode = activeWorkflow.nodes.find((n: any) => n.id === updatedExecutionState.currentNodeId);
              if (currentNode && currentNode.type === 'approval' && currentNode.data?.roleId) {
                console.log('[DEBUG] Looking for users with roleId:', currentNode.data.roleId);
                
                // Find users with this role in the company
                const roleAssignments = await UserRoleAssignment.find({
                  companyId: getCompanyId(requestRecord.requester.company || user.company),
                  roleId: currentNode.data.roleId
                }).populate('userId');
                
                console.log('[DEBUG] Notifying', roleAssignments.length, 'users for next approval role:', currentNode.label);
                
                for (const assignment of roleAssignments) {
                  if (assignment.userId) {
                    console.log('[DEBUG] Sending notification to user:', assignment.userId._id);
                    await notifyApprovalPending(
                      assignment.userId._id.toString(),
                      params.id,
                      updatedRequest.title,
                      user.name
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
          } catch (notificationError) {
            console.error('[ERROR] Failed to send next approver notifications:', notificationError);
            // Don't fail the request if notifications fail
          }
        } else {
          // Workflow completed or rejected - send status change notification
          try {
            await notifyStatusChange(
              params.id,
              newRequestStatus,
              user.id,
              action as 'approve' | 'reject',
              notes
            );
            console.log('[DEBUG] Status change notifications sent successfully');
          } catch (notificationError) {
            console.error('[ERROR] Failed to send notifications:', notificationError);
          }
        }

        return NextResponse.json(updatedRequest);

      } catch (workflowError) {
        console.error('[ERROR] Custom workflow processing failed:', workflowError);
        const errorMessage = workflowError instanceof Error ? workflowError.message : 'Unknown workflow error';
        return NextResponse.json(
          {
            error: `Failed to process approval through custom workflow: ${errorMessage}`,
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    }

    // Handle reject_with_clarification (query workflow)
    if (action === 'reject_with_clarification') {
      // Validate that query request is provided
      if (!notes || notes.trim() === '') {
        return NextResponse.json({ error: 'Query message is required when raising queries' }, { status: 400 });
      }

      console.log('[DEBUG] Reject with clarification:', {
        currentStatus: requestRecord.status,
        queryRequest: notes
      });

      // Add history entry for query
      const historyEntry: any = {
        action: ActionType.REJECT_WITH_CLARIFICATION,
        actor: user.id,
        previousStatus: requestRecord.status,
        newStatus: requestRecord.status, // Status doesn't change for queries
        timestamp: new Date(),
        queryRequest: notes,
        requiresClarification: true,
      };

      if (attachments?.length) {
        historyEntry.attachments = attachments;
      }

      const updateData: any = {
        $push: { history: historyEntry },
        $set: {
          pendingQuery: true,
          queryLevel: 'requester', // Always send queries to requester
        }
      };

      const updatedRequest = await Request.findByIdAndUpdate(
        params.id,
        updateData,
        { new: true }
      )
        .populate('requester', 'name email empId role')
        .populate('history.actor', 'name email empId role');

      console.log('[DEBUG] Query sent to requester');

      // Send notification to requester
      try {
        // Send generic notification for query
        const Notification = (await import('../../../../../models/Notification')).default;
        await Notification.create({
          userId: requestRecord.requester._id || requestRecord.requester,
          type: 'query_raised',
          title: 'Query Raised on Your Request',
          message: `${user.name} has raised a query on your request "${updatedRequest.title}"`,
          requestId: params.id,
          read: false,
        });
      } catch (notificationError) {
        console.error('[ERROR] Failed to send query notification:', notificationError);
      }

      return NextResponse.json(updatedRequest);
    }

  } catch (error) {
    console.error('[ERROR] Approval processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Failed to process approval',
        details: errorMessage,
        action: action || 'unknown',
        user: user?.email || 'unknown'
      },
      { status: 500 }
    );
  }
}
