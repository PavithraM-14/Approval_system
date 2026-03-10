import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import { getCurrentUser } from '@/lib/auth';
import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';

/**
 * POST /api/executions
 * 
 * Initializes a workflow execution for a request using the active workflow version for the company.
 * 
 * Requirements:
 * - 6.1: Retrieve active workflow configuration for request's company
 * - 6.2: Initialize request at workflow start node
 * - 9.3: Use latest active workflow version for new executions
 * 
 * Request Body: { requestId: string, workflowId?: string }
 * Response: Created execution state with initial position at start node
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

    const companyId = dbUser.company.toString();

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.requestId || typeof body.requestId !== 'string' || body.requestId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error: requestId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const requestId = body.requestId.trim();

    // Determine which workflow to use
    let workflowId: string;

    if (body.workflowId) {
      // If workflowId is provided, validate it
      if (typeof body.workflowId !== 'string' || body.workflowId.trim().length === 0) {
        return NextResponse.json(
          { error: 'Validation error: workflowId must be a non-empty string if provided' },
          { status: 400 }
        );
      }
      workflowId = body.workflowId.trim();
    } else {
      // If workflowId is not provided, find the active workflow for the company
      const activeWorkflow = await WorkflowConfiguration.findOne({
        companyId: dbUser.company,
        isActive: true,
      }).select('_id');

      if (!activeWorkflow) {
        return NextResponse.json(
          { error: 'No active workflow found for company' },
          { status: 404 }
        );
      }

      workflowId = activeWorkflow._id.toString();
    }

    // Initialize workflow execution using WorkflowExecutionEngine
    const executionState = await workflowExecutionEngine.initializeExecution(
      requestId,
      workflowId,
      companyId
    );

    return NextResponse.json(executionState, { status: 201 });
  } catch (error: any) {
    console.error('Initialize workflow execution error:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('No active workflow found')) {
      return NextResponse.json(
        {
          error: 'Workflow not found',
          details: error.message,
        },
        { status: 404 }
      );
    }

    if (error.message && error.message.includes('does not have a start node')) {
      return NextResponse.json(
        {
          error: 'Invalid workflow configuration',
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Handle duplicate requestId error (unique constraint violation)
    if (error.code === 11000 || (error.message && error.message.includes('duplicate'))) {
      return NextResponse.json(
        {
          error: 'Execution already exists',
          details: 'An execution already exists for this request',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to initialize workflow execution',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
