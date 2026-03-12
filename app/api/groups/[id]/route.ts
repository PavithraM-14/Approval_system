import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Group from '../../../../models/Group';
import UserGroupAssignment from '../../../../models/UserGroupAssignment';
import { getCurrentUser } from '../../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET a specific group
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

    const group = await Group.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    })
      .populate('parentGroupId', 'name type')
      .lean();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get member count
    const memberCount = await UserGroupAssignment.countDocuments({
      groupId: new mongoose.Types.ObjectId(params.id),
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    return NextResponse.json({ group: { ...group, memberCount } });
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch group' }, { status: 500 });
  }
}

// PUT update a group
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

    const { name, type, description, parentGroupId, isActive } = await request.json();

    const group = await Group.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Update fields
    if (name !== undefined) group.name = name.trim();
    if (type !== undefined) {
      if (!['region', 'department', 'cost_center', 'custom'].includes(type)) {
        return NextResponse.json({ error: 'Invalid group type' }, { status: 400 });
      }
      group.type = type;
    }
    if (description !== undefined) group.description = description?.trim();
    if (parentGroupId !== undefined) {
      group.parentGroupId = parentGroupId ? new mongoose.Types.ObjectId(parentGroupId) : undefined;
    }
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

    return NextResponse.json({ group });
  } catch (error: any) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: error.message || 'Failed to update group' }, { status: 500 });
  }
}

// DELETE a group
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

    const group = await Group.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if group has child groups
    const childGroups = await Group.countDocuments({
      parentGroupId: new mongoose.Types.ObjectId(params.id),
    });

    if (childGroups > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group with child groups. Please delete or reassign child groups first.' },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    group.isActive = false;
    await group.save();

    // Optionally remove user assignments
    await UserGroupAssignment.deleteMany({
      groupId: new mongoose.Types.ObjectId(params.id),
    });

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete group' }, { status: 500 });
  }
}
