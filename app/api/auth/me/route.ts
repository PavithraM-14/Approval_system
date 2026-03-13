import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import CustomRole from '../../../../models/CustomRole';
import UserRoleAssignment from '../../../../models/UserRoleAssignment';
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
    
    // Get the user
    const user = await User.findById(currentUser.id)
      .select('-password -gmailAccessToken -gmailRefreshToken -driveAccessToken -driveRefreshToken -otp');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get role through UserRoleAssignment
    const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
    let role = null;
    if (roleAssignment) {
      role = await CustomRole.findById(roleAssignment.roleId);
    }

    // Populate company only if it exists
    let populatedUser = user;
    if (user.company) {
      try {
        populatedUser = await User.findById(currentUser.id)
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
        role: role,
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