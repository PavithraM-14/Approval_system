import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import { deleteUserData } from '../../../../lib/audit-service';
import { UserRole } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only chairman can delete user data
    if (user.role !== UserRole.CHAIRMAN) {
      return NextResponse.json({ error: 'Forbidden: Only Chairman can delete user data' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await deleteUserData(userId, user.id);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
