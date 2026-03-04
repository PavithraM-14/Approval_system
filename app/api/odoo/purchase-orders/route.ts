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
    const state = searchParams.get('state');
    const partnerId = searchParams.get('partnerId');

    const odoo = getOdooClient();
    const filters: any = {};
    
    if (state) filters.state = state;
    if (partnerId) filters.partnerId = parseInt(partnerId);

    const orders = await odoo.getPurchaseOrders(filters);

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('[ODOO] Purchase orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders', details: error.message },
      { status: 500 }
    );
  }
}
