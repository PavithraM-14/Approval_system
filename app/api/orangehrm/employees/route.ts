import { NextRequest, NextResponse } from 'next/server';
import { getOrangeHRMClient } from '@/lib/orangehrm-service';
import { getCurrentUser } from '@/lib/auth';

// Mock data for demo purposes
const MOCK_EMPLOYEES = [
  {
    empNumber: 1,
    firstName: 'Alice',
    lastName: 'Johnson',
    middleName: 'Marie',
    employeeId: 'EMP001',
    email: 'alice.johnson@company.com',
    jobTitle: 'Senior Software Engineer',
    department: 'Engineering'
  },
  {
    empNumber: 2,
    firstName: 'Bob',
    lastName: 'Williams',
    middleName: 'James',
    employeeId: 'EMP002',
    email: 'bob.williams@company.com',
    jobTitle: 'HR Manager',
    department: 'Human Resources'
  },
  {
    empNumber: 3,
    firstName: 'Carol',
    lastName: 'Davis',
    middleName: 'Ann',
    employeeId: 'EMP003',
    email: 'carol.davis@company.com',
    jobTitle: 'Financial Analyst',
    department: 'Finance'
  },
  {
    empNumber: 4,
    firstName: 'Daniel',
    lastName: 'Martinez',
    middleName: 'Luis',
    employeeId: 'EMP004',
    email: 'daniel.martinez@company.com',
    jobTitle: 'Marketing Specialist',
    department: 'Marketing'
  },
  {
    empNumber: 5,
    firstName: 'Emma',
    lastName: 'Garcia',
    middleName: 'Sofia',
    employeeId: 'EMP005',
    email: 'emma.garcia@company.com',
    jobTitle: 'Operations Manager',
    department: 'Operations'
  },
  {
    empNumber: 6,
    firstName: 'Frank',
    lastName: 'Rodriguez',
    middleName: 'Antonio',
    employeeId: 'EMP006',
    email: 'frank.rodriguez@company.com',
    jobTitle: 'Sales Director',
    department: 'Sales'
  },
  {
    empNumber: 7,
    firstName: 'Grace',
    lastName: 'Lee',
    middleName: 'Min',
    employeeId: 'EMP007',
    email: 'grace.lee@company.com',
    jobTitle: 'Product Manager',
    department: 'Product'
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

    // Try real OrangeHRM first, fall back to mock data
    if (!useMock) {
      try {
        const name = searchParams.get('name');
        const employeeId = searchParams.get('employeeId');
        const limit = searchParams.get('limit');

        const hrm = getOrangeHRMClient();
        const filters: any = {};
        
        if (name) filters.name = name;
        if (employeeId) filters.employeeId = employeeId;
        if (limit) filters.limit = parseInt(limit);

        const employees = await hrm.getEmployees(filters);
        return NextResponse.json({ success: true, data: employees, source: 'orangehrm' });
      } catch (error) {
        console.log('[OrangeHRM] Real OrangeHRM not available, using mock data');
      }
    }

    // Return mock data
    return NextResponse.json({ 
      success: true, 
      data: MOCK_EMPLOYEES,
      source: 'mock',
      message: 'Using demo data - OrangeHRM not connected'
    });
  } catch (error: any) {
    console.error('[OrangeHRM] Employees error:', error);
    // Even on error, return mock data for demo
    return NextResponse.json({ 
      success: true, 
      data: MOCK_EMPLOYEES,
      source: 'mock',
      message: 'Using demo data'
    });
  }
}
