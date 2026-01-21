import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import User from '../../../../models/User';
import { getCurrentUser } from '../../../../lib/auth';
import { RequestStatus, UserRole } from '../../../../lib/types';
import { approvalEngine } from '../../../../lib/approval-engine';
import { filterRequestsByVisibility, analyzeRequestVisibility } from '../../../../lib/request-visibility';

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's database record
    const dbUser = await User.findOne({ email: currentUser.email });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Test approval engine for MANAGER_REVIEW status
    const requiredApprovers = approvalEngine.getRequiredApprover(RequestStatus.MANAGER_REVIEW);

    // Get all requests in MANAGER_REVIEW status
    const managerReviewRequests = await Request.find({ status: RequestStatus.MANAGER_REVIEW })
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId')
      .lean();

    // Analyze visibility for each request
    const visibilityAnalysis = managerReviewRequests.map(request => ({
      requestId: request._id,
      title: request.title,
      status: request.status,
      visibility: analyzeRequestVisibility(request, currentUser.role as UserRole, dbUser._id.toString(), dbUser.college)
    }));

    // Apply full filtering
    const visibleRequests = filterRequestsByVisibility(
      managerReviewRequests,
      currentUser.role as UserRole,
      dbUser._id.toString(),
      dbUser.college,
      'pending'
    );

    return NextResponse.json({
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        dbId: dbUser._id.toString()
      },
      approvalEngine: {
        requiredApproversForManagerReview: requiredApprovers,
        isManagerRequiredForManagerReview: requiredApprovers.includes(UserRole.INSTITUTION_MANAGER)
      },
      managerReviewRequests: {
        total: managerReviewRequests.length,
        visibilityAnalysis,
        visibleAfterFiltering: visibleRequests.length,
        visibleRequests: visibleRequests.map(r => ({
          id: r._id,
          title: r.title,
          status: r.status,
          visibility: r._visibility
        }))
      }
    });
  } catch (error: any) {
    console.error('Debug visibility error:', error);
    return NextResponse.json({ error: error.message || 'Failed to debug visibility' }, { status: 500 });
  }
}