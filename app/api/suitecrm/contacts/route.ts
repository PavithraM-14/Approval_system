import { NextRequest, NextResponse } from 'next/server';
import { getSuiteCRMClient } from '@/lib/suitecrm-service';
import { getCurrentUser } from '@/lib/auth';

// Mock data for demo purposes
const MOCK_CONTACTS = [
  {
    id: 'c1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@abccorp.com',
    phone: '+1-555-0101',
    account_name: 'ABC Corporation',
    title: 'CEO'
  },
  {
    id: 'c2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@xyzltd.com',
    phone: '+1-555-0102',
    account_name: 'XYZ Limited',
    title: 'CFO'
  },
  {
    id: 'c3',
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.brown@defindustries.com',
    phone: '+1-555-0103',
    account_name: 'DEF Industries',
    title: 'Procurement Manager'
  },
  {
    id: 'c4',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@ghient.com',
    phone: '+1-555-0104',
    account_name: 'GHI Enterprises',
    title: 'Operations Director'
  },
  {
    id: 'c5',
    first_name: 'David',
    last_name: 'Williams',
    email: 'david.williams@jklsolutions.com',
    phone: '+1-555-0105',
    account_name: 'JKL Solutions',
    title: 'VP of Sales'
  },
  {
    id: 'c6',
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.davis@techcorp.com',
    phone: '+1-555-0106',
    account_name: 'Tech Corporation',
    title: 'Marketing Manager'
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

    // Try real SuiteCRM first, fall back to mock data
    if (!useMock) {
      try {
        const accountName = searchParams.get('account_name');
        const email = searchParams.get('email');
        const limit = searchParams.get('limit');

        const crm = getSuiteCRMClient();
        const filters: any = {};
        
        if (accountName) filters.account_name = accountName;
        if (email) filters.email = email;
        if (limit) filters.limit = parseInt(limit);

        const contacts = await crm.getContacts(filters);
        return NextResponse.json({ success: true, data: contacts, source: 'suitecrm' });
      } catch (error) {
        console.log('[SuiteCRM] Real SuiteCRM not available, using mock data');
      }
    }

    // Return mock data
    return NextResponse.json({ 
      success: true, 
      data: MOCK_CONTACTS,
      source: 'mock',
      message: 'Using demo data - SuiteCRM not connected'
    });
  } catch (error: any) {
    console.error('[SuiteCRM] Contacts error:', error);
    // Even on error, return mock data for demo
    return NextResponse.json({ 
      success: true, 
      data: MOCK_CONTACTS,
      source: 'mock',
      message: 'Using demo data'
    });
  }
}
