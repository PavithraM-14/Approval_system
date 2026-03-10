import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import { getCurrentUser } from '@/lib/auth';
import { WorkflowValidator } from '@/lib/workflow-validator';

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
    
    if (!structureValidation.valid) {
      return NextResponse.json(
        {
          error: 'Cannot activate invalid workflow',
          validationErrors: structureValidation.errors,
        },
        { status: 400 }
      );
    }

    // Validate roles
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
