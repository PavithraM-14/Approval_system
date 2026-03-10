import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
// Import Company model to ensure it's registered with Mongoose
import '../../../../models/Company';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch full user data from database including Google integration status
    await connectDB();
    
    // First, get the user without populating to check if company exists
    const user = await User.findById(currentUser.id)
      .populate('role')
      .select('-password -gmailAccessToken -gmailRefreshToken -driveAccessToken -driveRefreshToken -otp');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Populate company only if it exists
    let populatedUser = user;
    if (user.company) {
      try {
        populatedUser = await User.findById(currentUser.id)
          .populate('role')
          .populate('company')
          .select('-password -gmailAccessToken -gmailRefreshToken -driveAccessToken -driveRefreshToken -otp');
      } catch (populateError) {
        console.error('Error populating company:', populateError);
        // If populate fails, continue with unpopulated user
      }
    }
    
    return NextResponse.json({
      user: {
        id: populatedUser._id.toString(),
        email: populatedUser.email,
        name: populatedUser.name,
        empId: populatedUser.empId,
        role: populatedUser.role,
        company: populatedUser.company || null,
        companyId: populatedUser.company?._id?.toString() || null,
        college: populatedUser.college,
        department: populatedUser.department,
        gmailEnabled: populatedUser.gmailEnabled || false,
        driveEnabled: populatedUser.driveEnabled || false,
        isVerified: populatedUser.isVerified,
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}