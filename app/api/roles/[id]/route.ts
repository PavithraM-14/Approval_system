import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role';
import { getCurrentUser } from '@/lib/auth';
import roleService from '@/lib/role-service';
import mongoose from 'mongoose';

/**
 * GET /api/roles/:id
 * 
 * Retrieves a role by ID.
 * Verifies that the role belongs to the authenticated user's company.
 * 
 * Requirements:
 * - 1.5: Allow System Admin to view roles defined for their company
 * - 8.2: Enforce company-level isolation for role definitions
 * 
 * Path Parameters:
 * - id: Role ID
 * 
 * Response: Role
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the role
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
    const roleId = params.id;

    // Validate role ID format
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID format' },
        { status: 400 }
      );
    }

    // Retrieve role by ID
    const role = await Role.findById(roleId);

    // Check if role exists
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (role.company && role.company.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this role' },
        { status: 403 }
      );
    }

    return NextResponse.json(role, { status: 200 });
  } catch (error: any) {
    console.error('Get role error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve role',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roles/:id
 * 
 * Updates a role's name and/or description.
 * Workflow references use roleId, so no workflow updates needed.
 * 
 * Requirements:
 * - 1.3: Update role name and trigger workflow reference updates
 * - 8.2: Enforce company-level isolation
 * 
 * Path Parameters:
 * - id: Role ID
 * 
 * Request Body: { name?: string, description?: string }
 * Response: Updated Role
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the role
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

    const companyId = dbUser.company.toString();
    const roleId = params.id;

    // Validate role ID format
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID format' },
        { status: 400 }
      );
    }

    // Retrieve role by ID
    const role = await Role.findById(roleId);

    // Check if role exists
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (role.company && role.company.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this role' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate at least one field is provided
    if (!body.name && !body.description && body.description !== '') {
      return NextResponse.json(
        { error: 'Validation error: At least one field (name or description) must be provided' },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Validation error: name must be a non-empty string' },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (body.description !== undefined && typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'Validation error: description must be a string' },
        { status: 400 }
      );
    }

    // Update role using RoleService
    const updates: Partial<{ name: string; description: string }> = {};
    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.description !== undefined) {
      updates.description = body.description;
    }

    const updatedRole = await roleService.updateRole(roleId, updates);

    return NextResponse.json(updatedRole, { status: 200 });
  } catch (error: any) {
    console.error('Update role error:', error);
    
    // Handle duplicate role name error
    if (error.message && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: 'Role name already exists',
          details: error.message,
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
        error: 'Failed to update role',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles/:id
 * 
 * Deletes a role if it's not used in any active workflow and is not a system admin role.
 * This prevents breaking workflow configurations and protects system roles.
 * 
 * Requirements:
 * - 1.4: Prevent deletion if role is used in any active workflow
 * - 8.2: Enforce company-level isolation
 * - System admin roles cannot be deleted
 * 
 * Path Parameters:
 * - id: Role ID
 * 
 * Response: Success status
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the role
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

    const companyId = dbUser.company.toString();
    const roleId = params.id;

    // Validate role ID format
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID format' },
        { status: 400 }
      );
    }

    // Check if role is a system admin role before attempting deletion
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system admin roles
    if (role.isSystemAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete system admin roles' },
        { status: 403 }
      );
    }

    // Delete role using RoleService (includes usage check)
    await roleService.deleteRole(roleId, companyId);

    return NextResponse.json(
      {
        message: 'Role deleted successfully',
        roleId: roleId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete role error:', error);
    
    // Handle system admin role protection
    if (error.message && error.message.includes('Cannot delete system admin')) {
      return NextResponse.json(
        {
          error: 'Cannot delete system admin roles',
          details: error.message,
        },
        { status: 403 }
      );
    }
    
    // Handle role not found error
    if (error.message && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Role not found',
          details: error.message,
        },
        { status: 404 }
      );
    }

    // Handle role in use error
    if (error.message && error.message.includes('used in active workflows')) {
      return NextResponse.json(
        {
          error: 'Cannot delete role that is in use',
          details: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete role',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
