import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '../../../lib/mongodb';
import { getAuditLogs, getAuditStats } from '../../../lib/audit-service';
import { UserRole } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and chairman can view audit logs
    if (session.user.role !== UserRole.CHAIRMAN && session.user.role !== UserRole.CHIEF_DIRECTOR) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const targetType = searchParams.get('targetType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const statistics = await getAuditStats(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json({ stats: statistics });
    }

    const logs = await getAuditLogs({
      action: action as any,
      userId: userId || undefined,
      targetType: targetType || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      skip,
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
