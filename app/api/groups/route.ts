import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getCurrentUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET all groups for a company
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    console.log('[GROUPS API] Current user:', user);
    
    if (!user) {
      console.log('[GROUPS API] No user found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = (user as any).company || (user as any).companyId;
    console.log('[GROUPS API] Company ID:', companyId);
    
    if (!companyId) {
      console.log('[GROUPS API] User has no company association');
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    const groups = await Group.find({ 
      companyId: new mongoose.Types.ObjectId(companyId),
      isActive: true 
    })
      .populate('parentGroupId', 'name type')
      .sort({ type: 1, name: 1 })
      .lean();

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST create a new group
export async function POST(request: NextRequest) {
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

    const { name, type, description, parentGroupId } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    if (!['region', 'department', 'cost_center', 'custom'].includes(type)) {
      return NextResponse.json({ error: 'Invalid group type' }, { status: 400 });
    }

    // Check if group with same name already exists
    const existingGroup = await Group.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      name: name.trim(),
    });

    if (existingGroup) {
      return NextResponse.json({ error: 'Group with this name already exists' }, { status: 400 });
    }

    const group = await Group.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      name: name.trim(),
      type,
      description: description?.trim(),
      parentGroupId: parentGroupId ? new mongoose.Types.ObjectId(parentGroupId) : undefined,
      isActive: true,
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: error.message || 'Failed to create group' }, { status: 500 });
  }
}
