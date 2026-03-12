import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import SignupFormConfiguration from '../../../../models/SignupFormConfiguration';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET public signup form configuration for a role (no auth required)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const roleId = searchParams.get('roleId');

    if (!companyId || !roleId) {
      return NextResponse.json({ error: 'companyId and roleId are required' }, { status: 400 });
    }

    const configuration = await SignupFormConfiguration.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      roleId: new mongoose.Types.ObjectId(roleId),
      isActive: true,
    }).lean();

    if (!configuration) {
      // Return default configuration if none exists
      return NextResponse.json({
        configuration: {
          fields: SignupFormConfiguration.getDefaultFields(),
          requireGroupSelection: false,
          allowedGroupTypes: [],
          groupSelectionMode: 'single',
        },
      });
    }

    return NextResponse.json({ configuration });
  } catch (error: any) {
    console.error('Error fetching public signup form configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch configuration' }, { status: 500 });
  }
}
