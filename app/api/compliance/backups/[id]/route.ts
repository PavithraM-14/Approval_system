import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupId = params.id;
    if (!backupId || typeof backupId !== 'string') {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400 });
    }

    const BACKUP_DIR = path.join(process.cwd(), 'backups', 'requests');
    const filePath = path.join(BACKUP_DIR, `${backupId}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const backupData = JSON.parse(content);
      return NextResponse.json(backupData);
    } catch (e) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Failed to get backup:', error);
    return NextResponse.json({ error: 'Failed to get backup' }, { status: 500 });
  }
}
