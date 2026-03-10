import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { WorkflowValidator } from '@/lib/workflow-validator';
import mongoose from 'mongoose';

/**
 * PUT /api/workflows/:id
 *
 * Updates a workflow configuration by creating a new version.
 * This ensures in-progress executions continue on their original version.
 *
 * Requirements:
 * - 9.1: Create new workflow version when updating
 * - 8.3: Enforce company-level isolation
 *
 * Path Parameters:
 * - id: Workflow ID (base workflow identifier)
 *
 * Request Body: WorkflowConfiguration (without _id, timestamps)
 * Response: Updated workflow with new version
 *
 * Authentication: Required
 * Authorization: User must belong to the same company as the workflow
 */
export async function PUT(
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

    // Validate workflow ID format
    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      return NextResponse.json(
        { error: 'Invalid workflow ID format' },
        { status: 400 }
      );
    }

    // Retrieve existing workflow by ID
    const existingWorkflow = await WorkflowConfiguration.findById(workflowId);

    // Check if workflow exists
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (existingWorkflow.companyId.toString() !== companyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this workflow' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Validation error: name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.nodes || !Array.isArray(body.nodes) || body.nodes.length === 0) {
      return NextResponse.json(
        { error: 'Validation error: nodes array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.edges || !Array.isArray(body.edges)) {
      return NextResponse.json(
        { error: 'Validation error: edges array is required' },
        { status: 400 }
      );
    }

    // Find the highest version number for this workflow's company and name
    const latestVersion = await WorkflowConfiguration.findOne({
      companyId,
      name: body.name,
    })
      .sort({ version: -1 })
      .select('version');

    // Increment version number
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Create new workflow version object
    const newWorkflowData = {
      companyId,
      name: body.name,
      description: body.description,
      version: newVersion,
      isActive: body.isActive !== undefined ? body.isActive : false,
      nodes: body.nodes,
      edges: body.edges,
      createdBy: user.id,
    };

    // Validate workflow using WorkflowValidator
    const validator = new WorkflowValidator();
    const validationResult = validator.validate(newWorkflowData as any);

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Workflow validation failed',
          validationErrors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Validate roles (async validation)
    const roleValidationResult = await validator.validateRoles(
      newWorkflowData as any,
      companyId.toString()
    );

    if (!roleValidationResult.valid) {
      return NextResponse.json(
        {
          error: 'Workflow role validation failed',
          validationErrors: roleValidationResult.errors,
        },
        { status: 400 }
      );
    }

    // Create new workflow version in database
    const newWorkflow = await WorkflowConfiguration.create(newWorkflowData);

    // Populate createdBy field for response
    const populatedWorkflow = await WorkflowConfiguration.findById(newWorkflow._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populatedWorkflow, { status: 200 });
  } catch (error: any) {
    console.error('Update workflow error:', error);

    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/:id
 * 
 * Retrieves a workflow configuration by ID.
 * Verifies that the workflow belongs to the authenticated user's company.
 * 
 * Requirements:
 * - 4.3: Retrieve workflow configuration for company
 * - 8.3: Enforce company-level isolation
 * 
 * Path Parameters:
 * - id: Workflow ID
 * 
 * Response: WorkflowConfiguration
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the workflow
 */
export async function GET(
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

    // Validate workflow ID format
    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      return NextResponse.json(
        { error: 'Invalid workflow ID format' },
        { status: 400 }
      );
    }

    // Retrieve workflow by ID
    const workflow = await WorkflowConfiguration.findById(workflowId)
      .populate('createdBy', 'name email');

    // Check if workflow exists
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (workflow.companyId.toString() !== companyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this workflow' },
        { status: 403 }
      );
    }

    return NextResponse.json(workflow, { status: 200 });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/:id
 * 
 * Deletes a workflow configuration if there are no active executions using it.
 * This prevents breaking in-progress approval processes.
 * 
 * Requirements:
 * - 4.1: Delete workflow if no active executions
 * - 8.3: Enforce company-level isolation
 * 
 * Path Parameters:
 * - id: Workflow ID
 * 
 * Response: Success status
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the workflow
 */
export async function DELETE(
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

    // Validate workflow ID format
    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      return NextResponse.json(
        { error: 'Invalid workflow ID format' },
        { status: 400 }
      );
    }

    // Retrieve workflow by ID
    const workflow = await WorkflowConfiguration.findById(workflowId);

    // Check if workflow exists
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (workflow.companyId.toString() !== companyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this workflow' },
        { status: 403 }
      );
    }

    // Import ExecutionState model dynamically to avoid circular dependencies
    const ExecutionState = (await import('@/models/ExecutionState')).default;

    // Check for active executions using this workflow
    const activeExecutions = await ExecutionState.countDocuments({
      workflowId: workflowId,
      status: 'in_progress',
    });

    if (activeExecutions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete workflow with active executions',
          details: `This workflow has ${activeExecutions} active execution(s). Please wait for them to complete before deleting.`,
        },
        { status: 409 }
      );
    }

    // Delete the workflow
    await WorkflowConfiguration.findByIdAndDelete(workflowId);

    return NextResponse.json(
      {
        message: 'Workflow deleted successfully',
        workflowId: workflowId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
