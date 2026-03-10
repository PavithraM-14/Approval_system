import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { WorkflowValidator } from '@/lib/workflow-validator';

/**
 * POST /api/workflows/:id/validate
 * 
 * Validates a workflow configuration without saving it.
 * Returns detailed validation results including structure, connections, and role validation.
 * 
 * Requirements:
 * - 5.1: Validate exactly one start node
 * - 5.2: Validate at least one end node
 * - 5.3: Validate all nodes are reachable from start
 * - 5.4: Validate parallel split-join matching
 * - 5.5: Display specific error messages for validation failures
 * - 5.6: Prevent activation of invalid workflows
 * 
 * Path Parameters:
 * - id: Workflow ID (used for context, but validation is performed on request body)
 * 
 * Request Body: WorkflowConfiguration (without _id, timestamps)
 * Response: ValidationResult with valid flag and detailed errors
 * 
 * Authentication: Required
 * Authorization: User must belong to a company
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

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Validation error: name is required and must be a string'],
        },
        { status: 400 }
      );
    }

    if (!body.nodes || !Array.isArray(body.nodes)) {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Validation error: nodes array is required'],
        },
        { status: 400 }
      );
    }

    if (!body.edges || !Array.isArray(body.edges)) {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Validation error: edges array is required'],
        },
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

    // Validate workflow structure and connections
    const validator = new WorkflowValidator();
    const validationResult = validator.validate(workflowData as any);

    // If structure/connection validation fails, return immediately
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          valid: false,
          errors: validationResult.errors,
        },
        { status: 200 } // Return 200 with validation results
      );
    }

    // Validate roles (async validation)
    const roleValidationResult = await validator.validateRoles(
      workflowData as any,
      companyId.toString()
    );

    // Combine all validation results
    const allErrors = [
      ...validationResult.errors,
      ...roleValidationResult.errors,
    ];

    const isValid = validationResult.valid && roleValidationResult.valid;

    return NextResponse.json(
      {
        valid: isValid,
        errors: allErrors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Validate workflow error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Invalid JSON in request body'],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to validate workflow',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
