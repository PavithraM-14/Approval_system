import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Company from '../../../../models/Company';
import User from '../../../../models/User';
import Role from '../../../../models/Role';

/**
 * POST /api/auth/signup-company - Register a new company with system admin
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, otp, companyData } = body;

    if (!email || !otp || !companyData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const {
      companyName,
      adminName,
      adminEmail,
      adminContactNo,
      password,
      otp: storedOtp,
      otpTimestamp,
    } = companyData;

    // Verify OTP
    if (otp !== storedOtp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Check OTP expiry (10 minutes)
    const otpAge = Date.now() - new Date(otpTimestamp).getTime();
    if (otpAge > 10 * 60 * 1000) {
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name: companyName });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company name already registered' },
        { status: 400 }
      );
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Find or create System Admin role
    let systemAdminRole = await Role.findOne({ isSystemAdmin: true });
    
    if (!systemAdminRole) {
      // Create default system admin role
      systemAdminRole = await Role.create({
        name: 'System Admin',
        description: 'Full system administrator with all permissions',
        isSystemAdmin: true,
        permissions: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canShare: true,
          canDownload: true,
          canForward: true,
          canManageBudget: true,
          canESign: true,
          canApprove: true,
          canRaiseQueries: true,
        },
      });
    }

    // Create company
    const company = await Company.create({
      name: companyName,
      adminEmail,
      adminContactNo,
      isActive: true,
    });

    // Create system admin user
    const adminUser = await User.create({
      name: adminName,
      empId: 'ADMIN001', // Default admin employee ID
      email: adminEmail,
      contactNo: adminContactNo,
      password,
      role: systemAdminRole._id,
      company: company._id,
      isVerified: true,
      isActive: true,
    });

    // Update company with admin user ID
    await Company.findByIdAndUpdate(company._id, {
      adminUserId: adminUser._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Company registered successfully',
      company: {
        id: company._id,
        name: company.name,
      },
    });
  } catch (error) {
    console.error('Company signup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to register company',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
