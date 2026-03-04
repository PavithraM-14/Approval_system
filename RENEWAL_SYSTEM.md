# Automatic Renewal System

## Overview

The automatic renewal system allows requests to be automatically recreated after a specified period. When a renewal request is approved, the system calculates a renewal date and automatically creates a new request when that date is reached.

## How It Works

### 1. Creating a Renewal Request

When creating a request, users can select "Renewal Request" as the request type. This reveals additional fields:

- **Renewal Period**: Number (e.g., 12)
- **Renewal Period Unit**: Days, Months, or Years

Example: "12 Months" means the request will be automatically renewed after 12 months.

### 2. Approval Process

When a renewal request is approved:
1. The system calculates the renewal date based on the approval date + renewal period
2. The renewal date is stored in the request document
3. The request goes through the normal approval workflow

### 3. Automatic Renewal

The system runs a daily check (via scheduled task) that:
1. Finds all approved renewal requests where the renewal date has passed
2. Creates a new request with:
   - Same title (with "(Renewal)" suffix)
   - Same purpose, college, department, cost estimate
   - Same attachments and expense category
   - New request ID
   - Status: SUBMITTED (starts approval process from beginning)
3. Marks the original request as renewed
4. Sends email notification to the requester

### 4. Renewal Chain Tracking

Each renewed request stores:
- `parentRequestId`: The request ID of the original request
- `isRenewalGenerated`: Flag indicating this was auto-generated

This creates a chain of renewals that can be tracked.

## Setup Instructions

### Windows (Task Scheduler)

1. Open PowerShell as Administrator
2. Navigate to your project directory
3. Run the setup script:
   ```powershell
   .\setup-renewal-scheduler.ps1
   ```

This creates a scheduled task that runs daily at 2:00 AM.

### Manual Testing

To test the renewal process manually:

```bash
npm run renewals
```

This will:
- Check for requests due for renewal
- Create new renewal requests
- Send notifications
- Display a summary of processed renewals

## Configuration

### Changing the Schedule

To change when renewals are processed:

1. Open Task Scheduler (taskschd.msc)
2. Find "SEAD-AutomaticRenewals" task
3. Edit the trigger to change the schedule

### Monitoring

Check the renewal process logs:
- Task Scheduler History tab shows execution history
- Console output shows detailed processing information
- Email notifications are sent to requesters

## Database Fields

### Request Model

New fields added for renewal support:

```typescript
{
  requestType: 'one-time' | 'renewal',
  renewalPeriod: number,              // e.g., 12
  renewalPeriodUnit: 'days' | 'months' | 'years',
  renewalDate: Date,                  // Calculated when approved
  parentRequestId: string,            // Original request ID
  isRenewalGenerated: boolean         // Flag for auto-generated
}
```

## API Endpoints

No new API endpoints required. The renewal process:
- Uses existing request creation logic
- Runs as a background scheduled task
- Integrates with existing approval workflow

## Email Notifications

When a renewal is created, the requester receives an email with:
- New request ID
- Original request ID reference
- Request title
- Link to track the new request

## Best Practices

1. **Set Appropriate Renewal Periods**: Consider the nature of the request when setting renewal periods
2. **Monitor Renewals**: Regularly check that renewals are being created as expected
3. **Update Attachments**: If documents need updating, the requester should upload new versions
4. **Review Before Approval**: Even though it's automatic, each renewal goes through full approval

## Troubleshooting

### Renewals Not Being Created

1. Check if the scheduled task is running:
   ```powershell
   Get-ScheduledTask -TaskName "SEAD-AutomaticRenewals"
   ```

2. Run manually to see errors:
   ```bash
   npm run renewals
   ```

3. Check MongoDB connection in .env.local

### Email Notifications Not Sent

1. Verify EMAIL_USER and EMAIL_PASSWORD in .env.local
2. Check email service logs
3. Ensure requester has valid email address

## Future Enhancements

Possible improvements:
- Notification before renewal (e.g., 7 days before)
- Option to skip a renewal cycle
- Bulk renewal management interface
- Renewal history dashboard
- Custom renewal schedules per request type
