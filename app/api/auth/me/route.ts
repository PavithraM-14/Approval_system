import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch full user data from database including Google integration status
    await connectDB();
    const user = await User.findById(currentUser.id).select('-password -gmailAccessToken -gmailRefreshToken -driveAccessToken -driveRefreshToken -otp');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        empId: user.empId,
        role: user.role,
        college: user.college,
        department: user.department,
        gmailEnabled: user.gmailEnabled || false,
        driveEnabled: user.driveEnabled || false,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}