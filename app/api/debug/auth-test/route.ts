import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No user found',
        user: null
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User authenticated',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        empId: user.empId,
        role: {
          name: user.role?.name,
          isSystemAdmin: user.role?.isSystemAdmin,
          permissions: user.role?.permissions
        },
        department: user.department,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing auth',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
