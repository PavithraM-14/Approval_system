import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CustomRole from '@/models/CustomRole';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/roles/:id/users
 * 
 * Retrieves all users assigned to a specific role.
 * Verifies that the role belongs to the authenticated user's company.
 * 
 * Path Parameters:
 * - id: Role ID
 * 
 * Response: Array of users
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
    const role = await CustomRole.findById(roleId);

    // Check if role exists
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Verify company ownership (multi-tenant isolation)
    if (role.companyId && role.companyId.toString() !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this role' },
        { status: 403 }
      );
    }

    // Fetch all users with this role
    const users = await User.find({
      role: new mongoose.Types.ObjectId(roleId),
      company: new mongoose.Types.ObjectId(companyId),
    })
      .select('name email empId department contactNo isActive')
      .sort({ name: 1 });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Get role users error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve users',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
