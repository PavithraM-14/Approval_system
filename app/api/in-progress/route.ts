import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import { getCurrentUser } from '../../../lib/auth';
import { RequestStatus, UserRole } from '../../../lib/types';
import { filterRequestsByVisibility } from '../../../lib/request-visibility';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requesters don't have in-progress approvals
    if (user.role === UserRole.REQUESTER) {
      return NextResponse.json({
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user's database record
    let dbUser = null;
    if (mongoose.Types.ObjectId.isValid(user.id)) {
      dbUser = await User.findById(user.id);
    } else {
      dbUser = await User.findOne({ email: user.email });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all requests and apply sophisticated visibility filtering
    const allRequests = await Request.find({})
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
      .sort({ updatedAt: -1 })
      .lean();

    // Apply role-based visibility filtering - show both in-progress and approved requests
    const visibleRequests = filterRequestsByVisibility(
      allRequests,
      user.role as UserRole,
      dbUser._id.toString(),
      dbUser.college
      // No category filter - get all visible requests
    );

    // Filter to show requests where user has taken action (in-progress or completed)
    const inProgressRequests = visibleRequests.filter(request => {
      // Show requests where the user has approved or clarified, including completed ones
      const userTookAction = request._visibility?.userAction === 'approve' ||
        request._visibility?.userAction === 'clarify';

      // Include both in-progress and approved requests where user was involved
      const isRelevant = request._visibility?.category === 'in_progress' ||
        (request._visibility?.category === 'approved' && request.status === RequestStatus.APPROVED);

      return userTookAction && isRelevant;
    });

    // Apply pagination
    const skip = (page - 1) * limit;
    const filteredRequests = inProgressRequests.slice(skip, skip + limit);
    const total = inProgressRequests.length;

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get in-progress requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch in-progress requests' }, { status: 500 });
  }
}