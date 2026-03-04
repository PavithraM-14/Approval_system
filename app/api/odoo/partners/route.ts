import { NextRequest, NextResponse } from 'next/server';
import { getOdooClient } from '@/lib/odoo-service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const odoo = getOdooClient();
    const partners = await odoo.getPartners(search || undefined);

    return NextResponse.json({ success: true, data: partners });
  } catch (error: any) {
    console.error('[ODOO] Partners error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners', details: error.message },
      { status: 500 }
    );
  }
}
