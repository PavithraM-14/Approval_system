import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import User from '../../../models/User';
import { getCurrentUser } from '../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../lib/types';
import { filterRequestsByVisibility, analyzeRequestVisibility } from '../../../lib/request-visibility';
import mongoose from 'mongoose';
import { approvalEngine } from '../../../lib/approval-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Function to get role-based filter for pending approvals
function getPendingApprovalsFilter(userRole: UserRole, userId: any) {
  let filter: any = {};

  // For now, show all non-completed requests to any non-requester role
  // This will help debug the issue and ensure approvers can see requests
  if (userRole !== UserRole.REQUESTER) {
    filter.status = {
      $nin: [RequestStatus.APPROVED, RequestStatus.REJECTED]
    };
  } else {
    // Requesters should not see any approvals
    filter._id = { $exists: false };
  }

  return filter;
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG] Approvals API called');
  try {
    await connectDB();
    const user = await getCurrentUser();

    console.log('[DEBUG] Current user:', user ? { id: user.id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('[DEBUG] No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
    const permissions = {
      ...user.role.permissions,
      isSystemAdmin: user.role.isSystemAdmin
    };

    // Requesters don't have pending approvals to process
    if (permissions.canCreate) {
      console.log('[DEBUG] User is requester, redirecting to requests');
      return NextResponse.json({
        error: 'Requesters should use /api/requests endpoint',
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status'); // Get status filter from query

    console.log('[DEBUG] Query params:', { page, limit, statusFilter });

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
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role')
      .sort({ updatedAt: -1 })
      .lean(); // Convert to plain objects

    console.log('[DEBUG] Total requests in system:', allRequests.length);

    // Determine visibility mode based on status filter
    let visibleRequests: any[] = [];

    if (statusFilter === 'approved') {
      // Show all requests that the user has approved (not just finally approved ones)
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        dbUser.college,
        permissions,
        'approved'
      );
      console.log('[DEBUG] Filtered to user-approved requests:', visibleRequests.length);
    } else if (statusFilter === 'rejected') {
      // Manual filter for rejection category as defined in request-visibility
      visibleRequests = allRequests.filter(req => {
        const visibility = analyzeRequestVisibility(req, userRoleName, dbUser._id.toString(), dbUser.college, permissions);
        return visibility.canSee && (statusFilter === 'rejected' ? visibility.userAction === 'reject' || (req.status === 'rejected' && visibility.userAction === 'approve') : true);
      });
      // Better way: use the filter function
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        dbUser.college,
        permissions
      ).filter(req => {
         if (req.status !== RequestStatus.REJECTED) return false;
         
         // User-specific rejection logic similar to stats/route.ts
         const userHasRejected = req.history?.some((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          h.action === ActionType.REJECT
        );

        const userHasApproved = req.history?.some((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
        );

        return userHasRejected || userHasApproved;
      });
    } else if (statusFilter === 'in_progress') {
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        dbUser.college,
        permissions,
        'in_progress'
      );
    } else if (statusFilter === 'all') {
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        dbUser.college,
        permissions
      );
    } else {
      // Default: show only pending approvals
      visibleRequests = filterRequestsByVisibility(
        allRequests,
        userRoleName,
        dbUser._id.toString(),
        dbUser.college,
        permissions,
        'pending'
      );
    }

    // Debug: Show visibility analysis for MANAGER_REVIEW requests
    if (managerReviewRequests.length > 0 && !statusFilter) {
      console.log('[DEBUG] MANAGER_REVIEW requests visibility analysis:');
      managerReviewRequests.forEach(req => {
        const visibility = analyzeRequestVisibility(req, user.role as UserRole, dbUser._id.toString(), dbUser.college);

        // Check if this is a post-parallel-verification scenario
        const hasParallelVerificationHistory = req.history?.some((h: any) =>
          h.newStatus === RequestStatus.PARALLEL_VERIFICATION ||
          h.newStatus === RequestStatus.SOP_COMPLETED ||
          h.newStatus === RequestStatus.BUDGET_COMPLETED
        );

        // Check if manager has previously acted
        const managerPreviousActions = req.history?.filter((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString())
        );

        // Check when request was last set to manager_review
        const lastManagerReviewChange = req.history
          ?.filter((h: any) => h.newStatus === RequestStatus.MANAGER_REVIEW)
          ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        // Check if manager has acted after the last status change
        const managerActionsAfterStatusChange = lastManagerReviewChange ? req.history?.filter((h: any) =>
          (h.actor?._id?.toString() === dbUser._id.toString() || h.actor?.toString() === dbUser._id.toString()) &&
          new Date(h.timestamp) > new Date(lastManagerReviewChange.timestamp)
        ) : [];

        console.log(`[DEBUG] Request ${req._id}:`);
        console.log(`  - canSee=${visibility.canSee}, category=${visibility.category}, reason=${visibility.reason}`);
        console.log(`  - hasParallelVerificationHistory=${hasParallelVerificationHistory}`);
        console.log(`  - managerPreviousActions=${managerPreviousActions?.length || 0}`);
        console.log(`  - currentStatus=${req.status}`);
        console.log(`  - lastManagerReviewChange=${lastManagerReviewChange ? new Date(lastManagerReviewChange.timestamp).toISOString() : 'none'}`);
        console.log(`  - managerActionsAfterStatusChange=${managerActionsAfterStatusChange?.length || 0}`);
      });
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const filteredRequests = visibleRequests.slice(skip, skip + limit);
    const total = visibleRequests.length;

    console.log('[DEBUG] Returning', filteredRequests.length, 'requests after pagination');

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filter: statusFilter || 'pending' // Include filter info in response
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 });
  }
}