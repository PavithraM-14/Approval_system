import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Document from '../../../../models/Document';
import { getCurrentUser } from '../../../../lib/auth';

/**
 * GET /api/documents/search - Advanced document search
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Search parameters
    const query = searchParams.get('query') || '';
    const department = searchParams.get('department');
    const project = searchParams.get('project');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const fileType = searchParams.get('fileType');
    const uploadedBy = searchParams.get('uploadedBy');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minSize = searchParams.get('minSize');
    const maxSize = searchParams.get('maxSize');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Sort
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    console.log('[SEARCH] Document search parameters:', {
      query,
      department,
      project,
      category,
      status,
      tags,
      fileType,
      user: user.email
    });

    // Build MongoDB query
    let mongoQuery: any = { status };

    // Access control
    if (user.role === 'requester') {
      mongoQuery.$or = [
        { uploadedBy: user.id },
        { isPublic: true },
        { 'sharedWith.userId': user.id },
        { 'sharedWith.role': user.role },
        { 'sharedWith.department': user.department }
      ];
    } else {
      mongoQuery.$or = [
        { isPublic: true },
        { 'sharedWith.role': user.role },
        { 'sharedWith.department': user.department },
        { uploadedBy: user.id }
      ];
    }

    // Full-text search
    if (query) {
      mongoQuery.$text = { $search: query };
    }

    // Filters
    if (department) mongoQuery.department = department;
    if (project) mongoQuery.project = project;
    if (category) mongoQuery.category = category;
    if (tags && tags.length > 0) mongoQuery.tags = { $in: tags };
    if (fileType) mongoQuery.fileType = fileType.toUpperCase();
    if (uploadedBy) mongoQuery.uploadedBy = uploadedBy;

    // Date range
    if (dateFrom || dateTo) {
      mongoQuery.createdAt = {};
      if (dateFrom) {
        mongoQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        mongoQuery.createdAt.$lt = endDate;
      }
    }

    // File size range
    if (minSize || maxSize) {
      mongoQuery.fileSize = {};
      if (minSize) {
        mongoQuery.fileSize.$gte = parseInt(minSize);
      }
      if (maxSize) {
        mongoQuery.fileSize.$lte = parseInt(maxSize);
      }
    }

    console.log('[SEARCH] MongoDB query:', JSON.stringify(mongoQuery, null, 2));

    // Build sort object
    let sortObject: any = {};
    if (query && !sortBy) {
      // If text search, sort by relevance score
      sortObject = { score: { $meta: 'textScore' } };
    } else {
      sortObject[sortBy] = sortOrder;
    }

    // Execute query
    const [documents, total] = await Promise.all([
      Document.find(mongoQuery)
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email role department')
        .populate('parentFolder', 'name path')
        .lean(),
      Document.countDocuments(mongoQuery)
    ]);

    console.log('[SEARCH] Found', documents.length, 'documents');

    // Get aggregated statistics
    const stats = await Document.aggregate([
      { $match: mongoQuery },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
          totalDownloads: { $sum: '$downloadCount' },
          totalViews: { $sum: '$viewCount' },
          categories: { $addToSet: '$category' },
          fileTypes: { $addToSet: '$fileType' }
        }
      }
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        totalSize: 0,
        totalDownloads: 0,
        totalViews: 0,
        categories: [],
        fileTypes: []
      },
      query: {
        query,
        department,
        project,
        category,
        status,
        tags,
        fileType,
        dateFrom,
        dateTo
      }
    });
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return NextResponse.json({
      error: 'Failed to search documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
