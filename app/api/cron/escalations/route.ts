import { NextResponse } from 'next/server';
import { checkAndEscalateRequests, sendDailyReminders } from '../../../../lib/escalation-service';

// This endpoint should be called by a cron job (e.g., every hour)
export async function GET() {
  try {
    const escalationResult = await checkAndEscalateRequests();
    const reminderResult = await sendDailyReminders();

    return NextResponse.json({
      success: true,
      escalations: escalationResult,
      reminders: reminderResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
