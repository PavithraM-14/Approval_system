import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createAuditLog } from './audit-service';
import { AuditAction } from '../models/AuditLog';

const execAsync = promisify(exec);

interface BackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration?: number;
  error?: string;
}

/**
 * Create a MongoDB database backup
 */
export async function createDatabaseBackup(performedBy?: string): Promise<BackupResult> {
  const startTime = Date.now();
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not configured');
    }

    // Parse MongoDB URI to get database name
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'sead';
    
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'database');
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Use mongodump to create backup
    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
    
    console.log('Creating database backup...');
    await execAsync(command);

    // Get backup size
    const stats = await getDirectorySize(backupPath);
    const duration = Date.now() - startTime;

    console.log(`✓ Database backup created: ${backupPath}`);
    console.log(`  Size: ${formatBytes(stats)}`);
    console.log(`  Duration: ${duration}ms`);

    // Log the backup
    if (performedBy) {
      await createAuditLog({
        action: AuditAction.BACKUP_CREATE,
        userId: performedBy,
        targetType: 'system',
        details: {
          type: 'database',
          path: backupPath,
          size: stats,
          duration,
        },
      });
    }

    return {
      success: true,
      backupPath,
      size: stats,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Database backup failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Create a backup of uploaded files
 */
export async function createFilesBackup(performedBy?: string): Promise<BackupResult> {
  const startTime = Date.now();
  
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const backupDir = path.join(process.cwd(), 'backups', 'files');
    
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `files-${timestamp}`);

    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      console.log('No uploads directory found, skipping files backup');
      return {
        success: true,
        backupPath: 'N/A',
        size: 0,
        duration: Date.now() - startTime,
      };
    }

    // Copy files directory
    console.log('Creating files backup...');
    await copyDirectory(uploadsDir, backupPath);

    // Get backup size
    const stats = await getDirectorySize(backupPath);
    const duration = Date.now() - startTime;

    console.log(`✓ Files backup created: ${backupPath}`);
    console.log(`  Size: ${formatBytes(stats)}`);
    console.log(`  Duration: ${duration}ms`);

    // Log the backup
    if (performedBy) {
      await createAuditLog({
        action: AuditAction.BACKUP_CREATE,
        userId: performedBy,
        targetType: 'system',
        details: {
          type: 'files',
          path: backupPath,
          size: stats,
          duration,
        },
      });
    }

    return {
      success: true,
      backupPath,
      size: stats,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Files backup failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Create a complete system backup (database + files)
 */
export async function createFullBackup(performedBy?: string): Promise<{
  database: BackupResult;
  files: BackupResult;
  totalDuration: number;
}> {
  const startTime = Date.now();
  
  console.log('========================================');
  console.log('  Starting Full System Backup');
  console.log('========================================\n');

  const database = await createDatabaseBackup(performedBy);
  const files = await createFilesBackup(performedBy);

  const totalDuration = Date.now() - startTime;

  console.log('\n========================================');
  console.log('  Backup Complete');
  console.log('========================================');
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Database: ${database.success ? '✓' : '✗'}`);
  console.log(`Files: ${files.success ? '✓' : '✗'}`);
  console.log('');

  return {
    database,
    files,
    totalDuration,
  };
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<{
  database: Array<{ name: string; path: string; size: number; created: Date }>;
  files: Array<{ name: string; path: string; size: number; created: Date }>;
}> {
  const backupDir = path.join(process.cwd(), 'backups');
  const databaseDir = path.join(backupDir, 'database');
  const filesDir = path.join(backupDir, 'files');

  const database = await listBackupsInDirectory(databaseDir);
  const files = await listBackupsInDirectory(filesDir);

  return { database, files };
}

/**
 * Delete old backups (keep last N backups)
 */
export async function cleanupOldBackups(keepCount: number = 7): Promise<{
  deleted: number;
  kept: number;
}> {
  const backups = await listBackups();
  let deleted = 0;
  let kept = 0;

  // Cleanup database backups
  const dbBackups = backups.database.sort((a, b) => b.created.getTime() - a.created.getTime());
  for (let i = keepCount; i < dbBackups.length; i++) {
    await fs.rm(dbBackups[i].path, { recursive: true, force: true });
    deleted++;
  }
  kept += Math.min(keepCount, dbBackups.length);

  // Cleanup file backups
  const fileBackups = backups.files.sort((a, b) => b.created.getTime() - a.created.getTime());
  for (let i = keepCount; i < fileBackups.length; i++) {
    await fs.rm(fileBackups[i].path, { recursive: true, force: true });
    deleted++;
  }
  kept += Math.min(keepCount, fileBackups.length);

  return { deleted, kept };
}

/**
 * Restore database from backup
 */
export async function restoreDatabase(backupPath: string, performedBy?: string): Promise<BackupResult> {
  const startTime = Date.now();
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not configured');
    }

    // Verify backup exists
    await fs.access(backupPath);

    // Use mongorestore to restore backup
    const command = `mongorestore --uri="${mongoUri}" --drop "${backupPath}"`;
    
    console.log('Restoring database from backup...');
    await execAsync(command);

    const duration = Date.now() - startTime;

    console.log(`✓ Database restored from: ${backupPath}`);
    console.log(`  Duration: ${duration}ms`);

    // Log the restore
    if (performedBy) {
      await createAuditLog({
        action: AuditAction.BACKUP_CREATE,
        userId: performedBy,
        targetType: 'system',
        details: {
          type: 'database_restore',
          path: backupPath,
          duration,
        },
      });
    }

    return {
      success: true,
      backupPath,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Database restore failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

// Helper functions

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        size += await getDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    }
  } catch (error) {
    console.error(`Error getting directory size: ${dirPath}`, error);
  }
  
  return size;
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const files = await fs.readdir(src, { withFileTypes: true });
  
  for (const file of files) {
    const srcPath = path.join(src, file.name);
    const destPath = path.join(dest, file.name);
    
    if (file.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function listBackupsInDirectory(dirPath: string): Promise<Array<{
  name: string;
  path: string;
  size: number;
  created: Date;
}>> {
  try {
    await fs.access(dirPath);
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    const backups = await Promise.all(
      files
        .filter(f => f.isDirectory())
        .map(async (file) => {
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.stat(filePath);
          const size = await getDirectorySize(filePath);
          
          return {
            name: file.name,
            path: filePath,
            size,
            created: stats.birthtime,
          };
        })
    );
    
    return backups;
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
