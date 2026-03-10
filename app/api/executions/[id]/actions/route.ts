import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ExecutionState from '@/models/ExecutionState';
import { getCurrentUser } from '@/lib/auth';
import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';
import mongoose from 'mongoose';

/**
 * POST /api/executions/:id/actions
 * 
 * Processes an action (approve or reject) on a workflow execution.
 * Validates that the user has the required role to perform the action.
 * 
 * Requirements:
 * - 6.3: Advance request to next node when approval step is completed
 * - 6.4: Require action from user assigned to specified role
 * 
 * Request Body: { action: 'approved' | 'rejected', notes?: string }
 * Response: Updated execution state
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company and have the required role
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

    const companyId = dbUser.company.toString();
    const userId = user.id;

    // Validate execution ID format
    const executionId = params.id;
    if (!executionId || !mongoose.Types.ObjectId.isValid(executionId)) {
      return NextResponse.json(
        { error: 'Validation error: Invalid execution ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate action field
    if (!body.action || typeof body.action !== 'string') {
      return NextResponse.json(
        { error: 'Validation error: action is required and must be a string' },
        { status: 400 }
      );
    }

    const action = body.action.trim();
    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json(
        { error: 'Validation error: action must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Validate notes field if provided
    const notes = body.notes !== undefined && body.notes !== null ? String(body.notes) : undefined;

    // Verify execution exists and belongs to user's company (multi-tenant isolation)
    const executionState = await ExecutionState.findById(executionId);
    if (!executionState) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    if (executionState.companyId.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this execution' },
        { status: 403 }
      );
    }

    // Process the action using WorkflowExecutionEngine
    // This will validate user authorization and update execution state
    const updatedExecutionState = await workflowExecutionEngine.processAction(
      executionId,
      action as 'approved' | 'rejected',
      userId,
      notes
    );

    return NextResponse.json(updatedExecutionState, { status: 200 });
  } catch (error: any) {
    console.error('Process workflow action error:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('not assigned to the required role')) {
      return NextResponse.json(
        {
          error: 'Forbidden: User does not have required role',
          details: error.message,
        },
        { status: 403 }
      );
    }

    if (error.message && error.message.includes('not in progress')) {
      return NextResponse.json(
        {
          error: 'Invalid operation: Execution is not in progress',
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes('not an approval node')) {
      return NextResponse.json(
        {
          error: 'Invalid operation: Current node does not accept actions',
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Resource not found',
          details: error.message,
        },
        { status: 404 }
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

    return NextResponse.json(
      {
        error: 'Failed to process workflow action',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
