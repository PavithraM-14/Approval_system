import { NextRequest, NextResponse } from 'next/server';
import { workflowExecutionEngine } from '@/lib/workflow-execution-engine';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const requestId = params.id;
    const { selectedOptions, notes } = await request.json();

    // Validate input
    if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return NextResponse.json(
        { error: 'Selected options are required' },
        { status: 400 }
      );
    }

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Notes are required' },
        { status: 400 }
      );
    }

    // Get the request to find the workflow execution
    const Request = (await import('@/models/Request')).default;
    const requestDoc = await Request.findById(requestId);

    if (!requestDoc) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (!requestDoc.workflowExecutionId) {
      return NextResponse.json(
        { error: 'Request does not have an active workflow execution' },
        { status: 400 }
      );
    }

    // Process the options selection
    const updatedExecution = await workflowExecutionEngine.processOptionsAction(
      requestDoc.workflowExecutionId,
      selectedOptions,
      currentUser.id,
      notes
    );

    return NextResponse.json({
      success: true,
      message: `Request forwarded to ${selectedOptions.length} user${selectedOptions.length === 1 ? '' : 's'}`,
      executionId: updatedExecution._id,
      selectedOptions,
      parallelPaths: updatedExecution.parallelPaths
    });

  } catch (error: any) {
    console.error('Options processing error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process options selection',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
