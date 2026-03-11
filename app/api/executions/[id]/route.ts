import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import ExecutionState from '../../../../models/ExecutionState';
import { getCurrentUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const execution = await ExecutionState.findById(params.id).lean();

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Get execution error:', error);
    return NextResponse.json({ error: 'Failed to fetch execution' }, { status: 500 });
  }
}
