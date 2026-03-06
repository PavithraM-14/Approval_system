import { NextRequest, NextResponse } from 'next/server';
import { getOdooClient } from '@/lib/odoo-service';
import { getCurrentUser } from '@/lib/auth';

// Mock data for demo purposes
const MOCK_PARTNERS = [
  {
    id: 1,
    name: 'ABC Corporation',
    email: 'contact@abccorp.com',
    phone: '+1-555-1001',
    street: '123 Business Ave',
    city: 'New York',
    country_id: [1, 'United States']
  },
  {
    id: 2,
    name: 'XYZ Limited',
    email: 'info@xyzltd.com',
    phone: '+1-555-1002',
    street: '456 Commerce St',
    city: 'Los Angeles',
    country_id: [1, 'United States']
  },
  {
    id: 3,
    name: 'DEF Industries',
    email: 'sales@defindustries.com',
    phone: '+1-555-1003',
    street: '789 Industrial Blvd',
    city: 'Chicago',
    country_id: [1, 'United States']
  },
  {
    id: 4,
    name: 'GHI Enterprises',
    email: 'contact@ghient.com',
    phone: '+1-555-1004',
    street: '321 Enterprise Way',
    city: 'Houston',
    country_id: [1, 'United States']
  },
  {
    id: 5,
    name: 'JKL Solutions',
    email: 'hello@jklsolutions.com',
    phone: '+1-555-1005',
    street: '654 Solutions Dr',
    city: 'Phoenix',
    country_id: [1, 'United States']
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
        const search = searchParams.get('search');
        const odoo = getOdooClient();
        const partners = await odoo.getPartners(search || undefined);
        return NextResponse.json({ success: true, data: partners, source: 'odoo' });
      } catch (error) {
        console.log('[ODOO] Real Odoo not available, using mock data');
      }
    }

    // Return mock data
    return NextResponse.json({ 
      success: true, 
      data: MOCK_PARTNERS,
      source: 'mock',
      message: 'Using demo data - Odoo not connected'
    });
  } catch (error: any) {
    console.error('[ODOO] Partners error:', error);
    // Even on error, return mock data for demo
    return NextResponse.json({ 
      success: true, 
      data: MOCK_PARTNERS,
      source: 'mock',
      message: 'Using demo data'
    });
  }
}
