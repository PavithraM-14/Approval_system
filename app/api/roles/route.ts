import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import Role from '@/models/Role';

/**
 * GET /api/roles
 * 
 * Lists all roles for the current user's company (both system roles and custom workflow roles).
 * 
 * Response: Array of roles
 * 
 * Authentication: Required
 */
export async function GET() {
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

    // Get all roles for the company
    const roles = await Role.find({ company: companyId }).sort({ createdAt: -1 });

    return NextResponse.json(roles, { status: 200 });
  } catch (error: any) {
    console.error('Get roles error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve roles',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 * 
 * Creates a new role for the company with permissions.
 * 
 * Request Body: { 
 *   name: string, 
 *   description?: string,
 *   isSystemAdmin?: boolean,
 *   permissions?: object
 * }
 * Response: Created role with ID
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
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error: name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Create role
    const role = await Role.create({
      name: body.name.trim(),
      description: body.description?.trim() || '',
      company: companyId,
      isSystemAdmin: body.isSystemAdmin || false,
      permissions: body.permissions || {
        canView: true,
        canCreate: false,
        canEdit: false,
        canShare: false,
        canDownload: false,
        canForward: false,
        canManageBudget: false,
        canESign: false,
        canApprove: false,
        canRaiseQueries: false,
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error('Create role error:', error);
    
    // Handle duplicate role name error
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error: 'Role name already exists',
          details: 'A role with this name already exists in your company',
        },
        { status: 409 }
      );
    }

    // Handle validation errors
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
        error: 'Failed to create role',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
