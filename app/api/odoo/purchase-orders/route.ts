import { NextRequest, NextResponse } from 'next/server';
import { getOdooClient } from '@/lib/odoo-service';
import { getCurrentUser } from '@/lib/auth';

// Mock data for demo purposes
const MOCK_PURCHASE_ORDERS = [
  {
    id: 1,
    name: 'PO-2024-001',
    partner_id: [1, 'Tech Supplies Inc.'],
    date_order: '2024-02-15',
    amount_total: 45000,
    state: 'purchase',
    currency_id: [1, 'USD']
  },
  {
    id: 2,
    name: 'PO-2024-002',
    partner_id: [2, 'Office Equipment Ltd.'],
    date_order: '2024-02-20',
    amount_total: 18500,
    state: 'purchase',
    currency_id: [1, 'USD']
  },
  {
    id: 3,
    name: 'PO-2024-003',
    partner_id: [3, 'Software Vendors Co.'],
    date_order: '2024-03-01',
    amount_total: 32000,
    state: 'draft',
    currency_id: [1, 'USD']
  },
  {
    id: 4,
    name: 'PO-2024-004',
    partner_id: [4, 'Hardware Solutions'],
    date_order: '2024-03-08',
    amount_total: 67500,
    state: 'purchase',
    currency_id: [1, 'USD']
  },
  {
    id: 5,
    name: 'PO-2024-005',
    partner_id: [5, 'Furniture Depot'],
    date_order: '2024-03-12',
    amount_total: 22300,
    state: 'sent',
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

        const orders = await odoo.getPurchaseOrders(filters);
        return NextResponse.json({ success: true, data: orders, source: 'odoo' });
      } catch (error) {
        console.log('[ODOO] Real Odoo not available, using mock data');
      }
    }

    // Return mock data
    return NextResponse.json({ 
      success: true, 
      data: MOCK_PURCHASE_ORDERS,
      source: 'mock',
      message: 'Using demo data - Odoo not connected'
    });
  } catch (error: any) {
    console.error('[ODOO] Purchase orders error:', error);
    // Even on error, return mock data for demo
    return NextResponse.json({ 
      success: true, 
      data: MOCK_PURCHASE_ORDERS,
      source: 'mock',
      message: 'Using demo data'
    });
  }
}
