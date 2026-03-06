import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb';
import { createFullBackup, cleanupOldBackups } from '../lib/backup-service';

/**
 * This script creates a full system backup (database + files)
 * Run this periodically (e.g., daily) via cron or Task Scheduler
 * 
 * Usage: npm run backup
 */

async function run() {
  try {
    await connectDB();
    
    // Create full backup
    const result = await createFullBackup();
    
    // Cleanup old backups (keep last 7)
    console.log('Cleaning up old backups...');
    const cleanup = await cleanupOldBackups(7);
    console.log(`✓ Kept ${cleanup.kept} backups, deleted ${cleanup.deleted} old backups\n`);
    
    // Exit with appropriate code
    if (result.database.success && result.files.success) {
      console.log('✓ Backup completed successfully');
      process.exit(0);
    } else {
      console.error('✗ Backup completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

run();
