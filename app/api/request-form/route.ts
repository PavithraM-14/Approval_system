import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';
import RequestFormConfiguration from '@/models/RequestFormConfiguration';

export const dynamic = 'force-dynamic';

// GET current company's request form configuration (creates default if missing)
export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = (user as any).company || (user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    let config = await RequestFormConfiguration.findOne({ companyId: companyObjectId }).lean();

    if (!config) {
      const defaultFields = (RequestFormConfiguration as any).getDefaultFields();
      const created = await RequestFormConfiguration.create({
        companyId: companyObjectId,
        fields: defaultFields,
        createdBy: new mongoose.Types.ObjectId(user.id),
      });
      config = created.toObject();
    }

    return NextResponse.json({ configuration: config });
  } catch (error: any) {
    console.error('Error fetching request form configuration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch request form configuration' },
      { status: 500 }
    );
  }
}

// PUT update current company's request form configuration (admin only)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(user as any).role?.isSystemAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only system admins can update request form configuration' },
        { status: 403 }
      );
    }

    const companyId = (user as any).company || (user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    const body = await request.json();
    const { fields } = body || {};

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'Fields array is required' }, { status: 400 });
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const updated = await RequestFormConfiguration.findOneAndUpdate(
      { companyId: companyObjectId },
      {
        companyId: companyObjectId,
        fields,
        createdBy: new mongoose.Types.ObjectId(user.id),
      },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ configuration: updated });
  } catch (error: any) {
    console.error('Error updating request form configuration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update request form configuration' },
      { status: 500 }
    );
  }
}

