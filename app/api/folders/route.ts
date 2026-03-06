import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Folder from '../../../models/Folder';
import { getCurrentUser } from '../../../lib/auth';

/**
 * GET /api/folders - List folders
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const project = searchParams.get('project');
    const parentId = searchParams.get('parentId');

    // Build query
    let query: any = {};

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');

    // Access control
    if (user.role.isSystemAdmin) {
      // Admins see everything
      query = {};
    } else if (user.role.permissions.canCreate) {
      query.$or = [
        { createdBy: user.id },
        { isPublic: true },
        { 'sharedWith.userId': user.id },
        { 'sharedWith.role': userRoleName },
        { 'sharedWith.department': user.department }
      ];
    } else {
      query.$or = [
        { isPublic: true },
        { 'sharedWith.role': userRoleName },
        { 'sharedWith.department': user.department },
        { createdBy: user.id }
      ];
    }

    // Apply filters
    if (department) query.department = department;
    if (project) query.project = project;
    if (parentId) {
      query.parentFolder = parentId;
    } else {
      query.parentFolder = null; // Root folders
    }

    const folders = await Folder.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'name email role')
      .populate('parentFolder', 'name path')
      .lean();

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json({
      error: 'Failed to fetch folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/folders - Create a new folder
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, department, project, parentId, isPublic, sharedWith, tags, color, icon } = body;

    if (!name || !department) {
      return NextResponse.json({ 
        error: 'Name and department are required' 
      }, { status: 400 });
    }

    // Build path
    let folderPath = `/${department}`;
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
      folderPath = `${parentFolder.path}/${name}`;
    } else {
      folderPath = `/${department}/${name}`;
    }

    // Check if folder already exists
    const existingFolder = await Folder.findOne({ path: folderPath });
    if (existingFolder) {
      return NextResponse.json({ 
        error: 'A folder with this name already exists in this location' 
      }, { status: 400 });
    }

    // Create folder
    const folder = await Folder.create({
      name,
      description,
      department,
      project,
      parentFolder: parentId || null,
      path: folderPath,
      createdBy: user.id,
      isPublic: isPublic || false,
      sharedWith: sharedWith || [],
      tags: tags || [],
      color: color || '#3B82F6',
      icon: icon || 'folder'
    });

    const populatedFolder = await Folder.findById(folder._id)
      .populate('createdBy', 'name email role')
      .populate('parentFolder', 'name path');

    return NextResponse.json({
      success: true,
      folder: populatedFolder
    }, { status: 201 });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({
      error: 'Failed to create folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/folders?id={folderId} - Delete a folder
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const folder = await Folder.findById(folderId);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');

    // Check permissions
    const isOwner = folder.createdBy.toString() === user.id;
    const hasDeletePermission = folder.sharedWith.some(
      (share: any) => 
        (share.userId?.toString() === user.id || share.role === userRoleName) &&
        share.permissions.includes('delete')
    );

    if (!isOwner && !hasDeletePermission && !user.role.isSystemAdmin) {
      return NextResponse.json({ 
        error: 'Not authorized to delete this folder' 
      }, { status: 403 });
    }

    // Delete folder
    await Folder.findByIdAndDelete(folderId);

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({
      error: 'Failed to delete folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
