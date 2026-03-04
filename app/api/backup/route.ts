import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '../../../lib/mongodb';
import {
  createFullBackup,
  listBackups,
  cleanupOldBackups,
} from '../../../lib/backup-service';
import { UserRole } from '../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only chairman can view backups
    if (session.user.role !== UserRole.CHAIRMAN) {
      return NextResponse.json({ error: 'Forbidden: Only Chairman can view backups' }, { status: 403 });
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only chairman can create backups
    if (session.user.role !== UserRole.CHAIRMAN) {
      return NextResponse.json({ error: 'Forbidden: Only Chairman can create backups' }, { status: 403 });
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
    const result = await createFullBackup(session.user.id);

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
