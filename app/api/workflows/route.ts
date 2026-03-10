import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { WorkflowValidator } from '@/lib/workflow-validator';

/**
 * GET /api/workflows
 * 
 * Retrieves all workflow configurations for the authenticated user's company.
 * 
 * Response: Array of workflows
 * 
 * Authentication: Required
 * Authorization: User must belong to a company
 */
export async function GET(request: NextRequest) {
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

    // Fetch all workflows for the company, sorted by most recent first
    const workflows = await WorkflowConfiguration.find({ companyId })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email');

    return NextResponse.json(workflows, { status: 200 });
  } catch (error: any) {
    console.error('Get workflows error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve workflows',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * 
 * Creates a new workflow configuration for a company.
 * 
 * Requirements:
 * - 4.1: Persists complete workflow configuration
 * - 8.3: Enforces company-level isolation
 * 
 * Request Body: WorkflowConfiguration (without _id, timestamps)
 * Response: Created workflow with ID
 * 
 * Authentication: Required
 * Authorization: User must belong to a company
 */
export async function POST(request: NextRequest) {
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

    // Create workflow object for validation
    const workflowData = {
      companyId,
      name: body.name,
      description: body.description,
      version: body.version || 1,
      isActive: body.isActive || false,
      nodes: body.nodes,
      edges: body.edges,
      createdBy: user.id,
    };

    // Validate workflow using WorkflowValidator
    const validator = new WorkflowValidator();
    const validationResult = validator.validate(workflowData as any);

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
      workflowData as any,
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

    // Create workflow in database
    const workflow = await WorkflowConfiguration.create(workflowData);

    // Populate createdBy field for response
    const populatedWorkflow = await WorkflowConfiguration.findById(workflow._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populatedWorkflow, { status: 201 });
  } catch (error: any) {
    console.error('Create workflow error:', error);
    
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
        error: 'Failed to create workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
