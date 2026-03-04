# Backup & Disaster Recovery System

Complete automated backup solution for S.E.A.D. system with database and file backups.

## Overview

The backup system provides:
- ✅ Automated daily backups
- ✅ Database backups (MongoDB)
- ✅ File backups (uploaded documents)
- ✅ Automatic cleanup of old backups
- ✅ Manual backup creation
- ✅ Restore functionality
- ✅ Audit logging of all backup operations

---

## Quick Start

### 1. Install MongoDB Database Tools

The backup system requires `mongodump` and `mongorestore`.

**Windows:**
```powershell
# Option 1: Download from MongoDB
# Visit: https://www.mongodb.com/try/download/database-tools

# Option 2: Using Chocolatey
choco install mongodb-database-tools
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# Mac
brew install mongodb-database-tools
```

### 2. Set Up Automated Backups

**Windows:**
```powershell
.\setup-backup-scheduler.ps1
```

This creates a scheduled task that runs daily at 2:00 AM.

### 3. Test Manual Backup

```bash
npm run backup
```

---

## How It Works

### Backup Process

1. **Database Backup**
   - Uses `mongodump` to export MongoDB database
   - Creates timestamped backup folder
   - Stores in `backups/database/backup-YYYY-MM-DD-HH-MM-SS/`

2. **Files Backup**
   - Copies all uploaded files from `public/uploads/`
   - Creates timestamped backup folder
   - Stores in `backups/files/files-YYYY-MM-DD-HH-MM-SS/`

3. **Cleanup**
   - Keeps last 7 backups by default
   - Automatically deletes older backups
   - Configurable retention period

4. **Audit Logging**
   - Logs all backup operations
   - Records backup size and duration
   - Tracks who initiated the backup

---

## Usage

### Manual Backup

**Create Full Backup:**
```bash
npm run backup
```

**Output:**
```
========================================
  Starting Full System Backup
========================================

Creating database backup...
✓ Database backup created: C:\path\to\SEAD\backups\database\backup-2026-03-01-02-00-00
  Size: 15.3 MB
  Duration: 3245ms

Creating files backup...
✓ Files backup created: C:\path\to\SEAD\backups\files\files-2026-03-01-02-00-00
  Size: 125.7 MB
  Duration: 8932ms

Cleaning up old backups...
✓ Kept 7 backups, deleted 3 old backups

========================================
  Backup Complete
========================================
Total Duration: 12177ms
Database: ✓
Files: ✓
```

### API Endpoints

**List All Backups (Chairman only):**
```bash
GET /api/backup
```

**Response:**
```json
{
  "success": true,
  "backups": {
    "database": [
      {
        "name": "backup-2026-03-01-02-00-00",
        "path": "C:\\path\\to\\SEAD\\backups\\database\\backup-2026-03-01-02-00-00",
        "size": 16056320,
        "created": "2026-03-01T02:00:00.000Z"
      }
    ],
    "files": [
      {
        "name": "files-2026-03-01-02-00-00",
        "path": "C:\\path\\to\\SEAD\\backups\\files\\files-2026-03-01-02-00-00",
        "size": 131854336,
        "created": "2026-03-01T02:00:00.000Z"
      }
    ]
  }
}
```

**Create Manual Backup (Chairman only):**
```bash
POST /api/backup
Content-Type: application/json

{}
```

**Cleanup Old Backups (Chairman only):**
```bash
POST /api/backup
Content-Type: application/json

{
  "action": "cleanup",
  "keepCount": 7
}
```

---

## Restore from Backup

### Database Restore

**Manual Restore:**
```bash
# Windows
mongorestore --uri="your_mongodb_uri" --drop "C:\path\to\SEAD\backups\database\backup-2026-03-01-02-00-00"

# Linux/Mac
mongorestore --uri="your_mongodb_uri" --drop "/path/to/SEAD/backups/database/backup-2026-03-01-02-00-00"
```

**Using Node.js:**
```typescript
import { restoreDatabase } from './lib/backup-service';

const result = await restoreDatabase(
  'C:\\path\\to\\SEAD\\backups\\database\\backup-2026-03-01-02-00-00',
  'user_id_here'
);
```

### Files Restore

**Manual Restore:**
```bash
# Windows
xcopy /E /I "C:\path\to\SEAD\backups\files\files-2026-03-01-02-00-00" "C:\path\to\SEAD\public\uploads"

# Linux/Mac
cp -r /path/to/SEAD/backups/files/files-2026-03-01-02-00-00/* /path/to/SEAD/public/uploads/
```

---

## Scheduled Backups

### Windows Task Scheduler

**View Task:**
```powershell
Get-ScheduledTask -TaskName "SEAD-Daily-Backup"
```

**Run Task Manually:**
```powershell
Start-ScheduledTask -TaskName "SEAD-Daily-Backup"
```

**View Task History:**
```powershell
Get-ScheduledTaskInfo -TaskName "SEAD-Daily-Backup"
```

**Modify Schedule:**
1. Open Task Scheduler
2. Find "SEAD-Daily-Backup"
3. Right-click → Properties
4. Go to Triggers tab
5. Edit the trigger

**Remove Task:**
```powershell
Unregister-ScheduledTask -TaskName "SEAD-Daily-Backup" -Confirm:$false
```

### Linux/Mac Cron

**Edit Crontab:**
```bash
crontab -e
```

**Add Daily Backup at 2:00 AM:**
```bash
0 2 * * * cd /path/to/SEAD && npm run backup >> /path/to/SEAD/logs/backup.log 2>&1
```

---

## Configuration

### Backup Retention

**Default:** Keep last 7 backups

**Change Retention:**

Edit `scripts/createBackup.ts`:
```typescript
// Keep last 14 backups instead of 7
const cleanup = await cleanupOldBackups(14);
```

Or via API:
```bash
POST /api/backup
{
  "action": "cleanup",
  "keepCount": 14
}
```

### Backup Location

**Default Locations:**
- Database: `backups/database/`
- Files: `backups/files/`

**Change Location:**

Edit `lib/backup-service.ts`:
```typescript
// Change backup directory
const backupDir = path.join(process.cwd(), 'my-backups', 'database');
```

---

## Monitoring

### Check Backup Logs

```bash
# View latest backup log
cat logs/backup.log

# View last 50 lines
tail -n 50 logs/backup.log

# Watch log in real-time
tail -f logs/backup.log
```

### Verify Backup Success

```bash
# Check if backup directory exists
ls backups/database/

# Check backup size
du -sh backups/database/backup-2026-03-01-02-00-00

# Count number of backups
ls backups/database/ | wc -l
```

### Audit Trail

All backup operations are logged in the audit system:

```bash
GET /api/audit?action=backup_create&limit=10
```

---

## Disaster Recovery Plan

### Scenario 1: Database Corruption

1. **Stop the application**
   ```bash
   # Stop Next.js server
   Ctrl+C
   ```

2. **Identify latest good backup**
   ```bash
   ls -lt backups/database/
   ```

3. **Restore database**
   ```bash
   mongorestore --uri="your_mongodb_uri" --drop "backups/database/backup-2026-03-01-02-00-00"
   ```

4. **Restart application**
   ```bash
   npm run dev
   ```

5. **Verify data**
   - Log in to system
   - Check recent requests
   - Verify user accounts

### Scenario 2: File Loss

1. **Identify latest backup**
   ```bash
   ls -lt backups/files/
   ```

2. **Restore files**
   ```bash
   cp -r backups/files/files-2026-03-01-02-00-00/* public/uploads/
   ```

3. **Verify files**
   - Check document library
   - Test file downloads
   - Verify file permissions

### Scenario 3: Complete System Failure

1. **Set up new server**
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Restore database**
   ```bash
   mongorestore --uri="new_mongodb_uri" "backups/database/backup-2026-03-01-02-00-00"
   ```

4. **Restore files**
   ```bash
   cp -r backups/files/files-2026-03-01-02-00-00/* public/uploads/
   ```

5. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with correct values
   ```

6. **Start application**
   ```bash
   npm run build
   npm start
   ```

---

## Best Practices

### 1. Regular Testing
- Test restore process monthly
- Verify backup integrity
- Document restore procedures

### 2. Off-Site Backups
- Copy backups to external drive weekly
- Use cloud storage (OneDrive, Google Drive, Dropbox)
- Keep at least one off-site backup

### 3. Backup Verification
- Check backup logs daily
- Monitor backup sizes
- Alert on backup failures

### 4. Security
- Encrypt backup files
- Restrict access to backup directory
- Secure backup credentials

### 5. Documentation
- Document restore procedures
- Keep recovery time objectives (RTO)
- Maintain contact list for emergencies

---

## Troubleshooting

### Backup Fails: "mongodump not found"

**Solution:** Install MongoDB Database Tools
```bash
# Windows
choco install mongodb-database-tools

# Linux
sudo apt-get install mongodb-database-tools

# Mac
brew install mongodb-database-tools
```

### Backup Fails: "Permission denied"

**Solution:** Check directory permissions
```bash
# Windows
icacls backups /grant Users:F

# Linux/Mac
chmod -R 755 backups
```

### Backup Takes Too Long

**Solutions:**
1. Increase timeout in scheduled task
2. Exclude unnecessary collections
3. Use incremental backups
4. Compress backups

### Restore Fails: "Database not empty"

**Solution:** Use `--drop` flag
```bash
mongorestore --uri="your_uri" --drop "backup_path"
```

### Out of Disk Space

**Solutions:**
1. Reduce retention period
2. Compress old backups
3. Move backups to external storage
4. Clean up old logs

---

## Security Considerations

### Backup Encryption

**Encrypt Backups:**
```bash
# Windows (7-Zip)
7z a -p"password" backup.7z backups/database/backup-2026-03-01-02-00-00

# Linux/Mac (tar + gpg)
tar czf - backups/database/backup-2026-03-01-02-00-00 | gpg -c > backup.tar.gz.gpg
```

### Access Control

- Only Chairman can create/view backups
- Backup directory not web-accessible
- Audit all backup operations
- Secure MongoDB connection string

---

## Support

For backup issues:
1. Check logs: `logs/backup.log`
2. Verify MongoDB tools installed
3. Check disk space
4. Review audit logs: `/api/audit?action=backup_create`
5. Contact system administrator

---

## Future Enhancements

### Planned Features
- ✅ Cloud backup integration (AWS S3, Azure Blob)
- ✅ Incremental backups
- ✅ Backup compression
- ✅ Email notifications on backup failure
- ✅ Backup encryption by default
- ✅ Point-in-time recovery
- ✅ Automated restore testing
