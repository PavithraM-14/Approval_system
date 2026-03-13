import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import { getCurrentUser } from '@/lib/auth';
import { WorkflowValidator } from '@/lib/workflow-validator';
import CustomRole from '@/models/CustomRole';
import UserRoleAssignment from '@/models/UserRoleAssignment';
import mongoose from 'mongoose';

/**
 * POST /api/workflows/:id/activate
 * 
 * Activates a workflow version and deactivates any previously active version
 * for the same company. Only one workflow version can be active at a time per company.
 * 
 * Requirements:
 * - 9.3: New executions use the latest active workflow version
 * - 5.6: Prevent activation of workflows that fail validation
 * 
 * Path Parameters:
 * - id: Workflow ID to activate
 * 
 * Response: Success status with activated workflow
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Get user's company from database
    const dbUser = await User.findById(user.id).select('company');
    if (!dbUser || !dbUser.company) {
      return NextResponse.json(
        { error: 'Forbidden: User must be associated with a company' },
        { status: 403 }
      );
    }

    const companyId = dbUser.company;
    const workflowId = params.id;

    // Find the workflow to activate
    const workflow = await WorkflowConfiguration.findById(workflowId);
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify workflow belongs to user's company
    if (workflow.companyId.toString() !== companyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot activate workflow from another company' },
        { status: 403 }
      );
    }

    // Validate workflow before activation (Requirement 5.6)
    const validator = new WorkflowValidator();
    const structureValidation = validator.validate(workflow);
    
    console.log('[WORKFLOW ACTIVATION] Structure validation result:', structureValidation);
    
    if (!structureValidation.valid) {
      console.error('[WORKFLOW ACTIVATION] Validation failed:', structureValidation.errors);
      return NextResponse.json(
        {
          error: 'Cannot activate invalid workflow',
          validationErrors: structureValidation.errors,
        },
        { status: 400 }
      );
    }

    // Convert regular Role IDs to CustomRole IDs BEFORE validation
    console.log('[WORKFLOW ACTIVATION] Converting Role IDs to CustomRole IDs...');
    let workflowModified = false;
    
    for (const node of workflow.nodes) {
      if (node.type === 'approval' && node.data?.roleId) {
        const roleId = node.data.roleId;
        
        // Check if it's already a CustomRole
        let customRole = await CustomRole.findById(roleId);
        
        if (!customRole) {
          // Try to find as regular Role
          const sourceRole = await Role.findById(roleId);
          
          if (sourceRole) {
            console.log('[WORKFLOW ACTIVATION] Converting Role to CustomRole:', {
              roleId,
              roleName: sourceRole.name
            });
            
            // Create CustomRole from regular Role
            customRole = await CustomRole.create({
              name: sourceRole.name,
              description: sourceRole.description || `Custom role for ${sourceRole.name}`,
              companyId: companyId,
              permissions: sourceRole.permissions,
              sourceRoleId: roleId
            });
            
            // Update node to use CustomRole ID
            node.data.roleId = customRole._id;
            workflowModified = true;
            
            console.log('[WORKFLOW ACTIVATION] Created CustomRole:', {
              customRoleId: customRole._id,
              name: customRole.name
            });
          }
        }
      }
    }
    
    // Save workflow if we converted any Role IDs
    if (workflowModified) {
      await workflow.save();
      console.log('[WORKFLOW ACTIVATION] Workflow updated with CustomRole IDs');
    }

    // Validate roles (now all should be CustomRoles)
    const roleValidation = await validator.validateRoles(
      workflow,
      companyId.toString()
    );
    
    if (!roleValidation.valid) {
      return NextResponse.json(
        {
          error: 'Cannot activate workflow with invalid role references',
          validationErrors: roleValidation.errors,
        },
        { status: 400 }
      );
    }

    // Deactivate all other workflows for this company
    await WorkflowConfiguration.updateMany(
      {
        companyId: companyId,
        _id: { $ne: workflowId },
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    // Activate the specified workflow
    workflow.isActive = true;
    await workflow.save();

    // Automatically create UserRoleAssignment records for all users
    try {
      console.log('[WORKFLOW ACTIVATION] Auto-assigning users to roles...');
      
      // Get all users in the company
      const users = await User.find({ company: companyId }).populate('role');
      console.log('[WORKFLOW ACTIVATION] Found users in company:', users.length);
      
      // For each user, ensure they have a CustomRole and UserRoleAssignment
      for (const user of users) {
        if (!user.role) {
          console.log('[WORKFLOW ACTIVATION] User has no role:', user._id, user.name);
          continue;
        }
        
        const userRoleName = user.role.name;
        const userRoleId = user.role._id;
        
        console.log('[WORKFLOW ACTIVATION] Processing user:', {
          userId: user._id,
          userName: user.name,
          roleName: userRoleName,
          roleId: userRoleId
        });
        
        // Check if CustomRole exists for this role
        let customRole = await CustomRole.findOne({
          companyId: companyId,
          name: userRoleName
        });
        
        // If not, create it
        if (!customRole) {
          console.log('[WORKFLOW ACTIVATION] Creating CustomRole for:', userRoleName);
          
          customRole = await CustomRole.create({
            name: userRoleName,
            description: `Custom role for ${userRoleName}`,
            companyId: companyId,
            sourceRoleId: userRoleId
          });
          
          console.log('[WORKFLOW ACTIVATION] Created CustomRole:', {
            customRoleId: customRole._id,
            name: customRole.name
          });
        }
        
        // Check if UserRoleAssignment exists
        const existingAssignment = await UserRoleAssignment.findOne({
          userId: user._id,
          roleId: customRole._id,
          companyId: companyId
        });
        
        if (!existingAssignment) {
          const newAssignment = await UserRoleAssignment.create({
            userId: user._id,
            roleId: customRole._id,
            companyId: companyId
          });
          
          console.log('[WORKFLOW ACTIVATION] ✅ Created role assignment:', {
            assignmentId: newAssignment._id,
            userId: user._id,
            userName: user.name,
            roleId: customRole._id,
            roleName: customRole.name
          });
        } else {
          console.log('[WORKFLOW ACTIVATION] ℹ️ Role assignment already exists:', {
            userId: user._id,
            userName: user.name,
            roleName: customRole.name
          });
        }
      }
      
      console.log('[WORKFLOW ACTIVATION] ✅ User role assignment completed');
      
      // Fix existing workflow executions to use the updated workflow
      console.log('[WORKFLOW ACTIVATION] Fixing existing workflow executions...');
      
      try {
        const ExecutionState = mongoose.model('ExecutionState');
        
        // Find all in-progress executions for this company
        const executions = await ExecutionState.find({
          companyId: companyId,
          status: 'in_progress'
        });
        
        console.log('[WORKFLOW ACTIVATION] Found in-progress executions:', executions.length);
        
        for (const execution of executions) {
          // Get the current node from the execution
          const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
          
          if (!currentNode) {
            console.log('[WORKFLOW ACTIVATION] Current node not found in workflow:', execution.currentNodeId);
            continue;
          }
          
          // If it's an approval node, verify it has the correct roleId
          if (currentNode.type === 'approval' && currentNode.data?.roleId) {
            console.log('[WORKFLOW ACTIVATION] Execution using updated workflow:', {
              executionId: execution._id,
              currentNodeId: execution.currentNodeId,
              nodeLabel: currentNode.label,
              roleId: currentNode.data.roleId
            });
          }
        }
        
        console.log('[WORKFLOW ACTIVATION] ✅ Execution verification completed');
      } catch (executionFixError) {
        console.error('[WORKFLOW ACTIVATION] ❌ Failed to verify executions:', executionFixError);
      }
      
    } catch (roleAssignmentError) {
      console.error('[WORKFLOW ACTIVATION] ❌ Failed to auto-assign roles:', roleAssignmentError);
      // Don't fail the activation, just log the error
    }

    return NextResponse.json(
      {
        message: 'Workflow activated successfully',
        workflow: {
          _id: workflow._id,
          name: workflow.name,
          version: workflow.version,
          isActive: workflow.isActive,
          companyId: workflow.companyId,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Activate workflow error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to activate workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
