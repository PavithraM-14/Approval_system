import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import { getAuditLogs, getAuditStats } from '../../../lib/audit-service';
import { UserRole } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
    
    // Only admins, chairman and chief director can view audit logs
    if (!user.role.isSystemAdmin && userRoleName !== 'chairman' && userRoleName !== 'chief_director') {
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
