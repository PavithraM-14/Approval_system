import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import roleService from '@/lib/role-service';
import mongoose from 'mongoose';

/**
 * DELETE /api/roles/:id/users/:userId
 * 
 * Removes a user from a custom role.
 * Verifies that both the role and user belong to the authenticated user's company.
 * 
 * Requirements:
 * - 10.2: Allow System Admins to remove role assignments from users
 * - 8.2: Enforce company-level isolation
 * 
 * Path Parameters:
 * - id: Role ID
 * - userId: User ID to remove from role
 * 
 * Response: Success status
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company as the role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    const targetUserId = params.userId;

    // Validate role ID format
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID format' },
        { status: 400 }
      );
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Import CustomRole model
    const CustomRole = (await import('@/models/CustomRole')).default;

    // Verify role exists and belongs to user's company
    const role = await CustomRole.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    if (role.companyId.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this role' },
        { status: 403 }
      );
    }

    // Verify target user exists and belongs to the same company
    const targetUser = await User.findById(targetUserId).select('company');
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!targetUser.company || targetUser.company.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: User does not belong to this company' },
        { status: 403 }
      );
    }

    // Remove user from role using RoleService
    await roleService.removeUserFromRole(targetUserId, roleId);

    return NextResponse.json(
      {
        message: 'User removed from role successfully',
        userId: targetUserId,
        roleId: roleId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove user from role error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to remove user from role',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
