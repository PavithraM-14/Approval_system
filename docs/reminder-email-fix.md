# Reminder Email Fix - One Email Per Day

## Problem
The reminder email system had two critical issues:
1. It was sending multiple emails per day for requests pending more than 3 days (no tracking of when reminders were sent)
2. **CRITICAL**: The automatic scheduler was running on every API call in the Next.js serverless environment, causing constant reminder emails

## Solution
1. Added a `lastReminderSent` field to the Request model to track when the last reminder email was sent
2. The system now checks this field and only sends one reminder email per 24-hour period
3. Resets the field when the request status changes (new approval stage = fresh reminder cycle)
4. **DISABLED automatic scheduler** - reminders now only run via manual script execution

## Changes Made

### 1. Request Model (`models/Request.ts`)
- Added `lastReminderSent: { type: Date }` field to track the timestamp of the last reminder email

### 2. Send Reminders Script (`scripts/sendReminders.ts`)
- Added check to skip sending reminder if one was sent less than 24 hours ago
- Updates `lastReminderSent` timestamp after sending reminder
- Added console logging for better tracking

### 3. Notification Service (`lib/notification-service.ts`)
- Updated automatic reminder scheduler with same 24-hour check logic
- **DISABLED auto-start on module import** (was causing reminders on every API call)
- Scheduler function still available but must be manually started
- Added clear comments explaining why it's disabled

### 4. Approve Route (`app/api/requests/[id]/approve/route.ts`)
- Resets `lastReminderSent` to `null` when request status changes
- This ensures reminders start fresh for each new approval stage

## How to Run Reminders

### Option 1: Manual Script (Recommended for Development)
```bash
npm run reminders
```

### Option 2: Scheduled Task (Recommended for Production)

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at a specific time (e.g., 9:00 AM)
4. Action: Start a program
5. Program: `cmd.exe`
6. Arguments: `/c cd /d "C:\path\to\your\project" && npm run reminders`

**Linux/Mac (Cron):**
```bash
# Edit crontab
crontab -e

# Add this line to run daily at 9:00 AM
0 9 * * * cd /path/to/your/project && npm run reminders
```

**Render/Heroku (Cron Jobs):**
- Use Render Cron Jobs or Heroku Scheduler add-on
- Set command: `npm run reminders`
- Set schedule: Daily

## How It Works

### Initial Request Flow
1. **Day 0**: Request created at MANAGER_REVIEW status → `lastReminderSent` is `null`
2. **Day 1-2**: No reminders (not yet 3 days old)
3. **Day 3**: Request has been pending for 3 days → First reminder email sent → `lastReminderSent` updated
4. **Day 4**: 24 hours have passed since last reminder → Second reminder email sent → `lastReminderSent` updated
5. **Day 5**: 24 hours have passed since last reminder → Third reminder email sent → `lastReminderSent` updated

### When Status Changes
1. Manager approves → Status changes to VP_APPROVAL → `lastReminderSent` reset to `null`
2. **Day 0-2**: No reminders (not yet 3 days old at VP level)
3. **Day 3**: VP has had it for 3 days → First reminder sent → `lastReminderSent` updated
4. And so on...

### Multiple Script Runs
If the script runs multiple times within the same day:
- First run: Sends reminders for eligible requests
- Second run (same day): Skips all requests (already sent within 24 hours)
- Next day: Sends reminders again (24 hours have passed)

## Testing
To test the fix:
1. Run the reminder script: `npm run reminders`
2. Check console output - it should show which requests got reminders and which were skipped
3. Run the script again immediately - all requests should be skipped (already sent within 24 hours)
4. Wait 24 hours and run again - reminders should be sent again

## Important Notes
- **The automatic scheduler is DISABLED** to prevent reminders on every API call
- Use the manual script with a proper scheduler (cron, Task Scheduler, etc.)
- The 24-hour check is based on actual time elapsed, not calendar days
- When a request status changes, `lastReminderSent` is reset to `null` (new status = new approval cycle)
- Each approval stage gets its own reminder cycle (e.g., reminders at MANAGER_REVIEW are separate from reminders at VP_APPROVAL)
- The threshold is configurable via `REMINDER_DAYS` environment variable (default: 3 days)
