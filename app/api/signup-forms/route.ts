import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import SignupFormConfiguration from '../../../models/SignupFormConfiguration';
import { getCurrentUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET all signup form configurations for a company
export async function GET(request: NextRequest) {
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
    const roleId = searchParams.get('roleId');

    let query: any = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isActive: true,
    };

    if (roleId) {
      query.roleId = new mongoose.Types.ObjectId(roleId);
    }

    const configurations = await SignupFormConfiguration.find(query)
      .sort({ roleName: 1 })
      .lean();

    return NextResponse.json({ configurations });
  } catch (error: any) {
    console.error('Error fetching signup form configurations:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch configurations' }, { status: 500 });
  }
}

// POST create a new signup form configuration
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

    const {
      roleId,
      roleName,
      fields,
      requireGroupSelection,
      allowedGroupTypes,
      groupSelectionMode,
    } = await request.json();

    if (!roleId || !roleName) {
      return NextResponse.json({ error: 'roleId and roleName are required' }, { status: 400 });
    }

    // Check if configuration already exists
    const existing = await SignupFormConfiguration.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      roleId: new mongoose.Types.ObjectId(roleId),
    });

    if (existing) {
      return NextResponse.json({ error: 'Configuration already exists for this role' }, { status: 400 });
    }

    // Use default fields if none provided
    const finalFields = fields && fields.length > 0 
      ? fields 
      : SignupFormConfiguration.getDefaultFields();

    const configuration = await SignupFormConfiguration.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      roleId: new mongoose.Types.ObjectId(roleId),
      roleName,
      fields: finalFields,
      requireGroupSelection: requireGroupSelection || false,
      allowedGroupTypes: allowedGroupTypes || [],
      groupSelectionMode: groupSelectionMode || 'single',
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(user.id),
    });

    return NextResponse.json({ configuration }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating signup form configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to create configuration' }, { status: 500 });
  }
}
