import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Document from '../../../../models/Document';
import Request from '../../../../models/Request';
import AuditLog from '../../../../models/AuditLog';
import { getCurrentUser } from '../../../../lib/auth';

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate compliance metrics
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalDocuments,
      expiringSoon,
      pendingReviews,
      auditLogCount
    ] = await Promise.all([
      Document.countDocuments({ status: 'active' }),
      Document.countDocuments({
        status: 'active',
        expiryDate: { $lte: thirtyDaysFromNow, $gte: now }
      }),
      Request.countDocuments({
        status: { $nin: ['approved', 'rejected'] }
      }),
      AuditLog.countDocuments({
        createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return NextResponse.json({
      compliant: totalDocuments - expiringSoon,
      expiringSoon,
      pendingReviews,
      auditLogs: auditLogCount,
      lastUpdated: now.toISOString()
    });
  } catch (error) {
    console.error('Compliance stats error:', error);
    return NextResponse.json({
      error: 'Failed to fetch compliance stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
