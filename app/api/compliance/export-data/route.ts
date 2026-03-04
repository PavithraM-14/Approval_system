import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import { exportUserData, createAuditLog } from '../../../../lib/audit-service';
import { AuditAction } from '../../../../models/AuditLog';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { userId } = body;

    // Users can export their own data, or admins can export any user's data
    if (userId !== session.user.id && session.user.role !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden: Cannot export other user data' }, { status: 403 });
    }

    const data = await exportUserData(userId);

    // Log the export
    await createAuditLog({
      action: AuditAction.DATA_EXPORT,
      userId: session.user.id,
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
