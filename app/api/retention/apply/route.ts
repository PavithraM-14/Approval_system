import { NextResponse } from 'next/server';
import { applyRetentionPolicies } from '../../../../lib/retention-service';
import { getCurrentUser } from '../../../../lib/auth';
import { UserRole } from '../../../../lib/types';

/**
 * Apply retention policies to documents
 * Should be called by cron job daily
 */
export async function POST() {
  try {
    const user = await getCurrentUser();

    // Only admins can trigger retention policy application
    if (!user || ![UserRole.CHAIRMAN, UserRole.CHIEF_DIRECTOR, UserRole.AUDIT].includes(user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await applyRetentionPolicies();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Apply retention policies error:', error);
    return NextResponse.json({
      error: 'Failed to apply retention policies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
