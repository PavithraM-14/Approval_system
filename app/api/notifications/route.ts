import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Notification from '../../../models/Notification';
import { getCurrentUser } from '../../../lib/auth';

/**
 * GET /api/notifications - Get user's notifications
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: any = { userId: user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requestId', 'title requestId status')
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: user.id, read: false }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications - Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all user's notifications as read
      await Notification.updateMany(
        { userId: user.id, read: false },
        { $set: { read: true } }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ 
        error: 'notificationIds array is required' 
      }, { status: 400 });
    }

    // Mark specific notifications as read
    await Notification.updateMany(
      { 
        _id: { $in: notificationIds },
        userId: user.id 
      },
      { $set: { read: true } }
    );

    return NextResponse.json({ 
      success: true, 
      message: `${notificationIds.length} notification(s) marked as read` 
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json({
      error: 'Failed to update notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications - Delete notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ 
        error: 'Notification ID is required' 
      }, { status: 400 });
    }

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Notification not found or unauthorized' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification deleted' 
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({
      error: 'Failed to delete notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
