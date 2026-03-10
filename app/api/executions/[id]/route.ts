import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ExecutionState from '@/models/ExecutionState';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/executions/:id
 * 
 * Retrieves the execution state for a specific execution ID, including the current position
 * in the workflow, execution history, and parallel path information.
 * 
 * Requirements:
 * - 7.1: Maintain current workflow position for each active approval request
 * - 7.4: Display request's progress through the workflow
 * - 7.5: Indicate which approval steps are pending, completed, and upcoming
 * 
 * Response: ExecutionState with history and current position
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the execution
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

    const companyId = dbUser.company.toString();

    // Validate execution ID format
    const executionId = params.id;
    if (!executionId || !mongoose.Types.ObjectId.isValid(executionId)) {
      return NextResponse.json(
        { error: 'Validation error: Invalid execution ID format' },
        { status: 400 }
      );
    }

    // Retrieve execution state
    const executionState = await ExecutionState.findById(executionId);

    if (!executionState) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (executionState.companyId.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this execution' },
        { status: 403 }
      );
    }

    // Return execution state with all details
    return NextResponse.json({
      _id: executionState._id,
      requestId: executionState.requestId,
      workflowId: executionState.workflowId,
      workflowVersion: executionState.workflowVersion,
      companyId: executionState.companyId,
      currentNodeId: executionState.currentNodeId,
      status: executionState.status,
      parallelPaths: executionState.parallelPaths,
      history: executionState.history,
      startedAt: executionState.startedAt,
      completedAt: executionState.completedAt,
    });
  } catch (error: any) {
    console.error('Get execution state error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve execution state',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
