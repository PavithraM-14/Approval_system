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

    const invoices = await odoo.getInvoices(filters);

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('[ODOO] Invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { partnerId, invoiceDate, lines } = body;

    if (!partnerId || !invoiceDate || !lines) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const odoo = getOdooClient();
    const invoiceId = await odoo.createInvoice({
      partnerId,
      invoiceDate,
      lines,
    });

    return NextResponse.json({ success: true, invoiceId });
  } catch (error: any) {
    console.error('[ODOO] Create invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  }
}
