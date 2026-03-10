import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/users/company/:companyId
 * 
 * Retrieves all users in a specific company.
 * Verifies that the authenticated user belongs to the same company.
 * 
 * Requirements:
 * - 10.1: List users in company for role assignment
 * - 8.2: Enforce company-level isolation
 * 
 * Path Parameters:
 * - companyId: Company ID
 * 
 * Response: Array of User objects (id, name, email)
 * 
 * Authentication: Required
 * Authorization: User must belong to the same company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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

    const userCompanyId = dbUser.company.toString();
    const requestedCompanyId = params.companyId;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Verify user belongs to the requested company
    if (userCompanyId !== requestedCompanyId) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this company' },
        { status: 403 }
      );
    }

    // Get all users in the company
    const users = await User.find({ company: requestedCompanyId })
      .select('_id name email empId')
      .sort({ name: 1 });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Get company users error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve company users',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
