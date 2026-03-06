import { NextRequest, NextResponse } from 'next/server';
import { getOdooClient } from '@/lib/odoo-service';
import { getCurrentUser } from '@/lib/auth';

// Mock data for demo purposes
const MOCK_INVOICES = [
  {
    id: 1,
    name: 'INV-2024-001',
    partner_id: [1, 'ABC Corporation'],
    invoice_date: '2024-03-01',
    amount_total: 15000,
    state: 'posted',
    currency_id: [1, 'USD']
  },
  {
    id: 2,
    name: 'INV-2024-002',
    partner_id: [2, 'XYZ Limited'],
    invoice_date: '2024-03-05',
    amount_total: 8500,
    state: 'posted',
    currency_id: [1, 'USD']
  },
  {
    id: 3,
    name: 'INV-2024-003',
    partner_id: [3, 'DEF Industries'],
    invoice_date: '2024-03-10',
    amount_total: 12300,
    state: 'draft',
    currency_id: [1, 'USD']
  },
  {
    id: 4,
    name: 'INV-2024-004',
    partner_id: [4, 'GHI Enterprises'],
    invoice_date: '2024-03-12',
    amount_total: 25000,
    state: 'posted',
    currency_id: [1, 'USD']
  },
  {
    id: 5,
    name: 'INV-2024-005',
    partner_id: [5, 'JKL Solutions'],
    invoice_date: '2024-03-15',
    amount_total: 6750,
    state: 'posted',
    currency_id: [1, 'USD']
  }
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const useMock = searchParams.get('mock') === 'true' || process.env.USE_MOCK_DATA === 'true';

    // Try real Odoo first, fall back to mock data
    if (!useMock) {
      try {
        const state = searchParams.get('state');
        const partnerId = searchParams.get('partnerId');

        const odoo = getOdooClient();
        const filters: any = {};
        
        if (state) filters.state = state;
        if (partnerId) filters.partnerId = parseInt(partnerId);

        const invoices = await odoo.getInvoices(filters);
        return NextResponse.json({ success: true, data: invoices, source: 'odoo' });
      } catch (error) {
        console.log('[ODOO] Real Odoo not available, using mock data');
      }
    }

    // Return mock data
    return NextResponse.json({ 
      success: true, 
      data: MOCK_INVOICES,
      source: 'mock',
      message: 'Using demo data - Odoo not connected'
    });
  } catch (error: any) {
    console.error('[ODOO] Invoices error:', error);
    // Even on error, return mock data for demo
    return NextResponse.json({ 
      success: true, 
      data: MOCK_INVOICES,
      source: 'mock',
      message: 'Using demo data'
    });
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
