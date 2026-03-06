import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import {
  getRetentionPolicies,
  createRetentionPolicy,
  checkUpcomingRetentions,
} from '../../../../lib/retention-service';
import { UserRole } from '../../../../lib/types';
import { RetentionAction } from '../../../../models/RetentionPolicy';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
    
    // Only admins can view retention policies
    if (!user.role.isSystemAdmin && userRoleName !== 'chairman' && userRoleName !== 'chief_director') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const upcoming = searchParams.get('upcoming') === 'true';

    if (upcoming) {
      const upcomingRetentions = await checkUpcomingRetentions();
      return NextResponse.json({ upcomingRetentions });
    }

    const policies = await getRetentionPolicies(activeOnly);
    return NextResponse.json({ policies });
  } catch (error) {
    console.error('Error fetching retention policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention policies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');

    // Only chairman can create retention policies
    if (!user.role.isSystemAdmin && userRoleName !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden: Only Chairman can create retention policies' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      documentType,
      category,
      retentionPeriodDays,
      action,
      notifyBeforeDays,
    } = body;

    if (!name || !retentionPeriodDays || !action) {
      return NextResponse.json(
        { error: 'Name, retention period, and action are required' },
        { status: 400 }
      );
    }

    if (!Object.values(RetentionAction).includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: archive, delete, or notify' },
        { status: 400 }
      );
    }

    const policy = await createRetentionPolicy({
      name,
      description,
      documentType,
      category,
      retentionPeriodDays,
      action,
      notifyBeforeDays,
      createdBy: user.id,
    });

    return NextResponse.json({
      success: true,
      policy,
      message: 'Retention policy created successfully',
    });
  } catch (error) {
    console.error('Error creating retention policy:', error);
    return NextResponse.json(
      { error: 'Failed to create retention policy' },
      { status: 500 }
    );
  }
}
