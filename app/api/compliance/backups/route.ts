import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Request from '@/models/Request';
import fs from 'fs/promises';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'requests');

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await fs.access(BACKUP_DIR);
    } catch {
      return NextResponse.json({ backups: [] });
    }

    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        try {
          const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          backups.push({
            id: file.replace('.json', ''),
            date: stats.birthtime.toISOString(),
            size: formatBytes(stats.size),
            status: 'Success',
            type: content.type || 'Incremental',
            requestCount: content.requests?.length || 0,
          });
        } catch (e) {
          // Ignore invalid JSON files
        }
      }
    }

    // Sort by date descending
    backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Failed to get backups:', error);
    return NextResponse.json({ error: 'Failed to get backups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch all requests
    const requests = await Request.find({}).lean();

    // Create backup directory if it doesn't exist
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Generate a new backup ID
    const backupId = `bck-${Math.floor(Math.random() * 10000) + 10000}`;
    const filePath = path.join(BACKUP_DIR, `${backupId}.json`);

    const backupData = {
      backupId,
      date: new Date().toISOString(),
      type: 'Full System',
      requests,
    };

    // Write to file
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    const stats = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      backup: {
        id: backupId,
        date: backupData.date,
        size: formatBytes(stats.size),
        status: 'Success',
        type: backupData.type,
      }
    });

  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
