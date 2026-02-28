import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import { getCurrentUser } from '../../../../lib/auth';
import { UserRole } from '../../../../lib/types';
import { filterRequestsByVisibility } from '../../../../lib/request-visibility';
import User from '../../../../models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Extract search parameters
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';
    const college = searchParams.get('college') || '';
    const department = searchParams.get('department') || '';
    const expenseCategory = searchParams.get('expenseCategory') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const minAmount = searchParams.get('minAmount') || '';
    const maxAmount = searchParams.get('maxAmount') || '';

    console.log('[SEARCH] Search parameters:', {
      query,
      status,
      college,
      department,
      expenseCategory,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount
    });

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

    // Build MongoDB query
    let mongoQuery: any = {};

    // Text search on title, purpose, and requestId
    if (query) {
      mongoQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { purpose: { $regex: query, $options: 'i' } },
        { requestId: { $regex: query, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      mongoQuery.status = status;
    }

    // College filter
    if (college) {
      mongoQuery.college = college;
    }

    // Department filter
    if (department) {
      mongoQuery.department = department;
    }

    // Expense category filter
    if (expenseCategory) {
      mongoQuery.expenseCategory = expenseCategory;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      mongoQuery.createdAt = {};
      if (dateFrom) {
        mongoQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        mongoQuery.createdAt.$lt = endDate;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      mongoQuery.costEstimate = {};
      if (minAmount) {
        mongoQuery.costEstimate.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        mongoQuery.costEstimate.$lte = parseFloat(maxAmount);
      }
    }

    console.log('[SEARCH] MongoDB query:', JSON.stringify(mongoQuery, null, 2));

    // Fetch requests matching the query
    const requests = await Request.find(mongoQuery)
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    console.log('[SEARCH] Found', requests.length, 'requests before visibility filtering');

    // Apply role-based visibility filtering
    const visibleRequests = filterRequestsByVisibility(
      requests,
      user.role as UserRole,
      dbUser._id.toString(),
      dbUser.college
    );

    console.log('[SEARCH] Returning', visibleRequests.length, 'requests after visibility filtering');

    return NextResponse.json({
      requests: visibleRequests,
      total: visibleRequests.length,
      query: {
        query,
        status,
        college,
        department,
        expenseCategory,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount
      }
    });
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return NextResponse.json({
      error: 'Failed to search requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
