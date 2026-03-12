import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import SignupFormConfiguration from '../../../../models/SignupFormConfiguration';
import { getCurrentUser } from '../../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET a specific signup form configuration
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

    const configuration = await SignupFormConfiguration.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    }).lean();

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ configuration });
  } catch (error: any) {
    console.error('Error fetching signup form configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch configuration' }, { status: 500 });
  }
}

// PUT update a signup form configuration
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

    const {
      roleName,
      fields,
      requireGroupSelection,
      allowedGroupTypes,
      groupSelectionMode,
      isActive,
    } = await request.json();

    const configuration = await SignupFormConfiguration.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Update fields
    if (roleName !== undefined) configuration.roleName = roleName;
    if (fields !== undefined) configuration.fields = fields;
    if (requireGroupSelection !== undefined) configuration.requireGroupSelection = requireGroupSelection;
    if (allowedGroupTypes !== undefined) configuration.allowedGroupTypes = allowedGroupTypes;
    if (groupSelectionMode !== undefined) configuration.groupSelectionMode = groupSelectionMode;
    if (isActive !== undefined) configuration.isActive = isActive;

    await configuration.save();

    return NextResponse.json({ configuration });
  } catch (error: any) {
    console.error('Error updating signup form configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to update configuration' }, { status: 500 });
  }
}

// DELETE a signup form configuration
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

    const configuration = await SignupFormConfiguration.findOne({
      _id: params.id,
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Soft delete
    configuration.isActive = false;
    await configuration.save();

    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting signup form configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete configuration' }, { status: 500 });
  }
}
