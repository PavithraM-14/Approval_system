import { NextRequest, NextResponse } from 'next/server';
import { getSuiteCRMClient } from '@/lib/suitecrm-service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountName = searchParams.get('account_name');
    const email = searchParams.get('email');
    const limit = searchParams.get('limit');

    const crm = getSuiteCRMClient();
    const filters: any = {};
    
    if (accountName) filters.account_name = accountName;
    if (email) filters.email = email;
    if (limit) filters.limit = parseInt(limit);

    const contacts = await crm.getContacts(filters);

    return NextResponse.json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('[SuiteCRM] Contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error.message },
      { status: 500 }
    );
  }
}
