import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import { exportUserData, createAuditLog } from '../../../../lib/audit-service';
import { AuditAction } from '../../../../models/AuditLog';
import { UserRole } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { userId } = body;

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');

    // Users can export their own data, or admins/chairman can export any user's data
    if (userId !== user.id && !user.role.isSystemAdmin && userRoleName !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden: Cannot export other user data' }, { status: 403 });
    }

    const data = await exportUserData(userId);

    // Log the export
    await createAuditLog({
      action: AuditAction.DATA_EXPORT,
      userId: user.id,
      targetType: 'user',
      targetId: userId,
      details: { reason: 'GDPR data export request' },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data,
      message: 'User data exported successfully',
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}
