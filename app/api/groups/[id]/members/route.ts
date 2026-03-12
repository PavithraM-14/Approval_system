import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import UserGroupAssignment from '../../../../../models/UserGroupAssignment';
import User from '../../../../../models/User';
import Group from '../../../../../models/Group';
import { getCurrentUser } from '../../../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET all members of a group
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

    // Verify group exists and belongs to company
    const group = await Group.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const assignments = await UserGroupAssignment.find({
      groupId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    })
      .populate('userId', 'name email empId')
      .sort({ assignedAt: -1 })
      .lean();

    const members = assignments.map(a => ({
      userId: a.userId._id,
      name: a.userId.name,
      email: a.userId.email,
      empId: a.userId.empId,
      assignedAt: a.assignedAt,
    }));

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch group members' }, { status: 500 });
  }
}

// POST add members to a group (bulk)
export async function POST(
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

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 });
    }

    // Verify group exists and belongs to company
    const group = await Group.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify all users exist and belong to company
    const users = await User.find({
      _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
      company: new mongoose.Types.ObjectId(companyId),
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'Some users not found or do not belong to company' }, { status: 400 });
    }

    // Create assignments (using insertMany with ordered: false to skip duplicates)
    const assignments = userIds.map(userId => ({
      userId: new mongoose.Types.ObjectId(userId),
      groupId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    }));

    const result = await UserGroupAssignment.insertMany(assignments, { ordered: false })
      .catch(error => {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
          return { insertedCount: error.result?.nInserted || 0 };
        }
        throw error;
      });

    return NextResponse.json({
      message: 'Members added successfully',
      addedCount: result.insertedCount || result.length,
    });
  } catch (error: any) {
    console.error('Error adding group members:', error);
    return NextResponse.json({ error: error.message || 'Failed to add group members' }, { status: 500 });
  }
}

// DELETE remove a member from a group
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
    }

    const result = await UserGroupAssignment.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      groupId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Member assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Error removing group member:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove group member' }, { status: 500 });
  }
}
