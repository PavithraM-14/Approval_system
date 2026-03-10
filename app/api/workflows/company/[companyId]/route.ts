import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkflowConfiguration from '@/models/WorkflowConfiguration';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/workflows/company/:companyId
 * 
 * Lists all workflows for a specific company.
 * Enforces multi-tenant isolation by verifying the authenticated user belongs to the requested company.
 * 
 * Requirements:
 * - 8.1: Enforce company-level isolation for all workflow configurations
 * - 8.3: Display only the user's company workflow configuration
 * 
 * Path Parameters:
 * - companyId: Company ID to retrieve workflows for
 * 
 * Response: Array of WorkflowConfiguration
 * 
 * Authentication: Required
 * Authorization: User must belong to the requested company
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

    const userCompanyId = dbUser.company;
    const requestedCompanyId = params.companyId;

    // Validate company ID format
    if (!mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Enforce multi-tenant isolation: verify user belongs to requested company
    if (userCompanyId.toString() !== requestedCompanyId.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this company\'s workflows' },
        { status: 403 }
      );
    }

    // Retrieve all workflows for the company
    const workflows = await WorkflowConfiguration.find({
      companyId: requestedCompanyId,
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }); // Most recent first

    return NextResponse.json(workflows, { status: 200 });
  } catch (error: any) {
    console.error('List workflows by company error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve workflows',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
