import { NextRequest, NextResponse } from 'next/server';
import { getOrangeHRMClient } from '@/lib/orangehrm-service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const employeeId = searchParams.get('employeeId');
    const limit = searchParams.get('limit');

    const hrm = getOrangeHRMClient();
    const filters: any = {};
    
    if (name) filters.name = name;
    if (employeeId) filters.employeeId = employeeId;
    if (limit) filters.limit = parseInt(limit);

    const employees = await hrm.getEmployees(filters);

    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    console.error('[OrangeHRM] Employees error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}
