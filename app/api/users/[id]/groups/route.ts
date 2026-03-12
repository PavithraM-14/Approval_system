import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import UserGroupAssignment from '../../../../../models/UserGroupAssignment';
import User from '../../../../../models/User';
import { getCurrentUser } from '../../../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET all groups for a user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = (user as any).company;
    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    // Verify user exists and belongs to company
    const targetUser = await User.findOne({
      _id: params.id,
      company: new mongoose.Types.ObjectId(companyId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const assignments = await UserGroupAssignment.find({
      userId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    })
      .populate('groupId')
      .sort({ assignedAt: -1 })
      .lean();

    const groups = assignments.map(a => a.groupId);

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user groups' }, { status: 500 });
  }
}

// PUT update user's group assignments (replace all)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = (user as any).company;
    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    const { groupIds } = await request.json();

    if (!Array.isArray(groupIds)) {
      return NextResponse.json({ error: 'groupIds array is required' }, { status: 400 });
    }

    // Verify user exists and belongs to company
    const targetUser = await User.findOne({
      _id: params.id,
      company: new mongoose.Types.ObjectId(companyId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove all existing assignments
    await UserGroupAssignment.deleteMany({
      userId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    // Add new assignments
    if (groupIds.length > 0) {
      const assignments = groupIds.map(groupId => ({
        userId: new mongoose.Types.ObjectId(params.id),
        groupId: new mongoose.Types.ObjectId(groupId),
        companyId: new mongoose.Types.ObjectId(companyId),
      }));

      await UserGroupAssignment.insertMany(assignments);
    }

    return NextResponse.json({ message: 'User groups updated successfully' });
  } catch (error: any) {
    console.error('Error updating user groups:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user groups' }, { status: 500 });
  }
}
