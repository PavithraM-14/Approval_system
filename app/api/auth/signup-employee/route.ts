import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Company from '../../../../models/Company';
import Role from '../../../../models/Role';
import UserGroupAssignment from '../../../../models/UserGroupAssignment';
import Group from '../../../../models/Group';
import mongoose from 'mongoose';

/**
 * POST /api/auth/signup-employee - Register a new employee for existing company
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, otp, employeeData } = body;

    if (!email || !otp || !employeeData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const {
      name,
      empId,
      email: employeeEmail,
      contactNo,
      password,
      companyId,
      roleId,
      groupIds,
      otp: storedOtp,
      otpTimestamp,
      ...customFields
    } = employeeData;

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

    // Check if email already exists
    const existingUser = await User.findOne({ email: employeeEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existingEmpId = await User.findOne({ empId });
    if (existingEmpId) {
      return NextResponse.json(
        { error: 'Employee ID already registered' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Verify role exists and is not system admin
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    if (role.isSystemAdmin) {
      return NextResponse.json(
        { error: 'Cannot sign up as system admin' },
        { status: 403 }
      );
    }

    // Validate groups if provided
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      const groups = await Group.find({
        _id: { $in: groupIds.map(id => new mongoose.Types.ObjectId(id)) },
        companyId: new mongoose.Types.ObjectId(companyId),
        isActive: true,
      });

      if (groups.length !== groupIds.length) {
        return NextResponse.json(
          { error: 'Some selected groups are invalid or inactive' },
          { status: 400 }
        );
      }
    }

    // Create employee user with custom fields
    const userData: any = {
      name,
      empId,
      email: employeeEmail,
      contactNo,
      password,
      role: roleId,
      company: companyId,
      isVerified: true,
      isActive: true,
    };

    // Add custom fields to user data
    Object.keys(customFields).forEach(key => {
      if (customFields[key] !== undefined && customFields[key] !== null) {
        userData[key] = customFields[key];
      }
    });

    const employee = await User.create(userData);

    // Create group assignments if groups were selected
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      const groupAssignments = groupIds.map(groupId => ({
        userId: employee._id,
        groupId: new mongoose.Types.ObjectId(groupId),
        companyId: new mongoose.Types.ObjectId(companyId),
      }));

      await UserGroupAssignment.insertMany(groupAssignments);
    }

    return NextResponse.json({
      success: true,
      message: 'Employee account created successfully',
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error('Employee signup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create employee account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}