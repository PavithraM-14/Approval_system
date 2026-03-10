import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import mongoose from 'mongoose';

/**
 * GET /api/roles/company/:companyId
 * 
 * Retrieves all roles for a specific company (public endpoint for signup).
 * This endpoint is used during employee signup to show available roles.
 * 
 * Path Parameters:
 * - companyId: Company ID
 * 
 * Response: Array of roles
 * 
 * Authentication: Not required (public endpoint for signup)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    await connectDB();
    
    const companyId = params.companyId;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Fetch all roles for the company
    const roles = await Role.find({
      company: new mongoose.Types.ObjectId(companyId),
    })
      .select('name description isSystemAdmin permissions')
      .sort({ name: 1 });

    return NextResponse.json(roles, { status: 200 });
  } catch (error: any) {
    console.error('Get company roles error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve roles',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
