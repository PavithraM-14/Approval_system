import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import UserRoleAssignment from '../../../../models/UserRoleAssignment';
import CustomRole from '../../../../models/CustomRole';
import ExecutionState from '../../../../models/ExecutionState';
import WorkflowConfiguration from '../../../../models/WorkflowConfiguration';
import { getCurrentUser } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DEBUG] Fix workflow called by user:', user.email);

    // Get the user's database record
    const dbUser = await User.findById(user.id).populate('role company');
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    console.log('[DEBUG] User found:', {
      id: dbUser._id,
      email: dbUser.email,
      roleName: dbUser.role?.name,
      companyId: dbUser.company
    });

    // Find all custom roles for this company
    const customRoles = await CustomRole.find({ companyId: dbUser.company });
    console.log('[DEBUG] Custom roles found:', customRoles.map(r => ({ id: r._id, name: r.name })));

    // Find a role that matches the user's current role name
    const matchingRole = customRoles.find(r => 
      r.name.toLowerCase().includes('approver') || 
      r.name.toLowerCase().includes('boss') ||
      r.name.toLowerCase() === dbUser.role?.name?.toLowerCase()
    );

    if (!matchingRole) {
      return NextResponse.json({ 
        error: 'No matching custom role found',
        availableRoles: customRoles.map(r => ({ id: r._id, name: r.name }))
      }, { status: 400 });
    }

    console.log('[DEBUG] Matching role found:', { id: matchingRole._id, name: matchingRole.name });

    // Check if user already has this role assignment
    const existingAssignment = await UserRoleAssignment.findOne({
      userId: dbUser._id,
      roleId: matchingRole._id
    });

    if (!existingAssignment) {
      // Create the role assignment
      const assignment = new UserRoleAssignment({
        userId: dbUser._id,
        roleId: matchingRole._id,
        companyId: dbUser.company,
        assignedBy: dbUser._id,
        assignedAt: new Date()
      });

      await assignment.save();
      console.log('[DEBUG] Role assignment created');
    } else {
      console.log('[DEBUG] Role assignment already exists');
    }

    // Also check and fix any workflow executions stuck at Employee nodes
    const executions = await ExecutionState.find({ 
      status: 'in_progress',
      companyId: dbUser.company 
    });

    console.log('[DEBUG] Found executions:', executions.length);

    let fixedExecutions = 0;
    for (const execution of executions) {
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) continue;

      const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
      if (!currentNode || currentNode.type !== 'approval') continue;

      const nodeLabel = currentNode.label || '';
      const isRequesterNode = nodeLabel.toLowerCase().includes('employee') || 
                             nodeLabel.toLowerCase().includes('emplyee') ||
                             nodeLabel.toLowerCase().includes('requester') ||
                             nodeLabel.toLowerCase().includes('creator');

      if (isRequesterNode) {
        console.log('[DEBUG] Found execution stuck at requester node:', {
          executionId: execution._id,
          currentNode: currentNode.label
        });

        // Find the next node
        const nextEdge = workflow.edges.find((e: any) => e.source === currentNode.id);
        if (nextEdge) {
          const nextNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
          if (nextNode) {
            console.log('[DEBUG] Advancing to next node:', nextNode.label);
            
            execution.currentNodeId = nextNode.id;
            execution.history.push({
              nodeId: nextNode.id,
              nodeType: nextNode.type,
              action: 'entered',
              timestamp: new Date(),
            });

            await execution.save();
            fixedExecutions++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow fix completed',
      details: {
        userRoleAssigned: matchingRole.name,
        executionsFixed: fixedExecutions,
        totalExecutions: executions.length
      }
    });

  } catch (error) {
    console.error('[ERROR] Fix workflow error:', error);
    return NextResponse.json({
      error: 'Failed to fix workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}