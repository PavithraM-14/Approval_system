import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/workflows/:id/versions
 * 
 * Retrieves version history for a workflow.
 * Returns all versions of workflows with the same name and company.
 * 
 * Requirements:
 * - 9.4: Maintain a history of workflow versions for audit purposes
 * - 9.5: Allow System_Admins to view previous workflow versions
 * 
 * Path Parameters:
 * - id: Workflow ID (any version of the workflow)
 * 
 * Response: Array of WorkflowConfiguration (all versions, sorted by version descending)
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

    // Retrieve the base workflow to get its name and verify company ownership
    const baseWorkflow = await WorkflowConfiguration.findById(workflowId);

    // Check if workflow exists
    if (!baseWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (baseWorkflow.companyId.toString() !== companyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this workflow' },
        { status: 403 }
      );
    }

    // Retrieve all versions of this workflow (same name and company)
    const versions = await WorkflowConfiguration.find({
      companyId: companyId,
      name: baseWorkflow.name,
    })
      .sort({ version: -1 }) // Sort by version descending (newest first)
      .populate('createdBy', 'name email');

    return NextResponse.json(versions, { status: 200 });
  } catch (error: any) {
    console.error('Get workflow versions error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve workflow versions',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
