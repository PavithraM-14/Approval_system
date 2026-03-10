# Reminder Email Scheduler Setup

This guide will help you set up automatic daily reminder emails for pending approval requests.

## Quick Setup (Windows)

### Option 1: Automated Setup (Recommended)

1. Open PowerShell in the project directory
2. Run the setup script:
   ```powershell
   .\setup-reminder-scheduler.ps1
   ```
3. Follow the prompts
4. Done! Reminders will run daily at 9:00 AM

### Option 2: Manual Setup

1. Open **Task Scheduler** (search in Windows Start menu)
2. Click **Create Basic Task**
3. Configure as follows:
   - **Name**: `SEAD-Reminder-Emails`
   - **Description**: `Sends daily reminder emails for pending approval requests`
   - **Trigger**: Daily at 9:00 AM
   - **Action**: Start a program
   - **Program/script**: `cmd.exe`
   - **Add arguments**: `/c cd /d "C:\Users\mdkhu\SEAD" && npm run reminders`
   - **Start in**: `C:\Users\mdkhu\SEAD`
4. Click **Finish**

## Verify Setup

### Check if Task is Created
```powershell
Get-ScheduledTask -TaskName "SEAD-Reminder-Emails"
```

### Test the Task Manually
```powershell
Start-ScheduledTask -TaskName "SEAD-Reminder-Emails"
```

### View Task Logs
Check the log file at: `logs/reminders.log`

## Customize Schedule

To change the time when reminders are sent:

1. Open Task Scheduler
2. Find `SEAD-Reminder-Emails` task
3. Right-click → Properties
4. Go to **Triggers** tab
5. Edit the trigger and change the time
6. Click OK

## Remove Scheduled Task

If you want to remove the scheduled task:

```powershell
Unregister-ScheduledTask -TaskName "SEAD-Reminder-Emails" -Confirm:$false
```

Or use Task Scheduler GUI:
1. Open Task Scheduler
2. Find `SEAD-Reminder-Emails`
3. Right-click → Delete

## Troubleshooting

### Task doesn't run
- Check if the task is enabled in Task Scheduler
- Verify the project path is correct
- Make sure Node.js and npm are in your system PATH
- Check Windows Event Viewer for error messages

### No emails are sent
- Verify email configuration in `.env.local`:
  - `EMAIL_USER`
  - `EMAIL_PASSWORD`
  - `EMAIL_HOST`
  - `EMAIL_PORT`
- Run manually to see errors: `npm run reminders`
- Check the log file: `logs/reminders.log`

### Task runs but nothing happens
- Ensure MongoDB connection is working
- Check if there are any requests pending for more than 3 days
- Verify the `REMINDER_DAYS` environment variable (default: 3)

## Manual Execution

You can always run reminders manually:

```bash
npm run reminders
```

This is useful for:
- Testing the reminder system
- Running reminders on-demand
- Debugging issues

## How It Works

1. **Daily Check**: Task runs once per day at 9:00 AM
2. **Find Stale Requests**: Looks for requests pending > 3 days
3. **Check Last Reminder**: Only sends if 24+ hours since last reminder
4. **Send Emails**: Sends reminder to current approver(s)
5. **Update Timestamp**: Records when reminder was sent
6. **Log Results**: Writes to `logs/reminders.log`

## Environment Variables

Configure in `.env.local`:

```env
# Reminder Configuration
REMINDER_DAYS=3  # Number of days before sending first reminder

# Email Configuration (required)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM=noreply@yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_NAME=S.E.A.D.
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Production Deployment

For production environments (Render, Heroku, etc.), use their built-in cron job features:

### Render Cron Jobs
1. Go to your Render dashboard
2. Create a new Cron Job
3. Set command: `npm run reminders`
4. Set schedule: `0 9 * * *` (daily at 9:00 AM)

### Heroku Scheduler
1. Add Heroku Scheduler add-on
2. Create new job
3. Set command: `npm run reminders`
4. Set frequency: Daily at 9:00 AM

## Support

If you encounter issues:
1. Check the log file: `logs/reminders.log`
2. Run manually: `npm run reminders`
3. Verify environment variables
4. Check MongoDB connection
5. Verify email configuration
