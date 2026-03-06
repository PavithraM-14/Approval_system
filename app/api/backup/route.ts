import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import {
  createFullBackup,
  listBackups,
  cleanupOldBackups,
} from '../../../lib/backup-service';
import { UserRole } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
    
    // Only admins and chairman can view/manage backups
    if (!user.role.isSystemAdmin && userRoleName !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const backups = await listBackups();

    return NextResponse.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoleName = user.role.name.toLowerCase().replace(/ /g, '_');
    
    // Only admins and chairman can create/manage backups
    if (!user.role.isSystemAdmin && userRoleName !== 'chairman') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup') {
      const keepCount = body.keepCount || 7;
      const result = await cleanupOldBackups(keepCount);
      
      return NextResponse.json({
        success: true,
        message: `Kept ${result.kept} backups, deleted ${result.deleted} old backups`,
        result,
      });
    }

    // Default: create full backup
    const result = await createFullBackup(user.id);

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      result,
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
