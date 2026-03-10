import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ExecutionState from '@/models/ExecutionState';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/executions/request/:requestId
 * 
 * Retrieves the execution state for a specific request ID, allowing users to look up
 * execution state by request ID instead of execution ID.
 * 
 * Requirements:
 * - 7.1: Maintain current workflow position for each active approval request
 * 
 * Response: ExecutionState with history and current position
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the execution
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
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

    // Validate requestId
    const requestId = params.requestId;
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error: Invalid request ID' },
        { status: 400 }
      );
    }

    // Retrieve execution state by requestId
    const executionState = await ExecutionState.findOne({ requestId: requestId.trim() });

    if (!executionState) {
      return NextResponse.json(
        { error: 'Execution not found for this request' },
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
    console.error('Get execution state by request ID error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve execution state',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
