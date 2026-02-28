# Notification System

## Overview
The Notification System provides real-time alerts to stakeholders about approval workflow events. It includes both in-app notifications and email notifications to ensure users never miss important updates.

## Features

### 1. In-App Notifications
- **Real-time Updates**: Notifications appear instantly in the notification bell
- **Unread Badge**: Visual indicator showing number of unread notifications
- **Notification Types**:
  - ⏳ Approval Pending - New request awaiting your approval
  - ✅ Approval Approved - Your request has been approved
  - ❌ Approval Rejected - Your request has been rejected
  - ❓ Query Received - Clarification requested on your request
  - 💬 Query Responded - Response provided to your query
  - 📝 Request Created - New request submitted
  - 🎉 Request Completed - Request workflow completed

### 2. Email Notifications
- **Professional Templates**: Branded email templates with action buttons
- **Direct Links**: Click to view request directly from email
- **Detailed Information**: Includes request title, actor name, and relevant details
- **Color-Coded**: Different colors for different notification types
  - Blue: Pending approvals
  - Green: Approvals
  - Red: Rejections
  - Orange: Queries/Clarifications

### 3. Notification Bell Component
- **Dropdown Interface**: Click bell to view recent notifications
- **Quick Actions**:
  - Mark individual notifications as read
  - Mark all as read
  - Delete notifications
  - Navigate to request details
- **Auto-refresh**: Updates every 30 seconds
- **Responsive Design**: Works on mobile and desktop

## Notification Triggers

### When Request is Created
- **Who gets notified**: Next approver(s) in the workflow
- **Notification type**: `approval_pending`
- **Email sent**: Yes
- **Message**: "{Requester} has submitted '{Request Title}' for your approval"

### When Request is Approved
- **Who gets notified**: 
  - Requester (about the approval)
  - Next approver(s) in the workflow
- **Notification type**: `approval_approved` (for requester), `approval_pending` (for next approvers)
- **Email sent**: Yes
- **Message**: "Your request '{Request Title}' has been approved by {Approver Name} ({Role})"

### When Request is Rejected
- **Who gets notified**: Requester
- **Notification type**: `approval_rejected`
- **Email sent**: Yes
- **Message**: "Your request '{Request Title}' has been rejected by {Rejector Name} ({Role}). Reason: {Notes}"

### When Clarification is Requested
- **Who gets notified**: Target user (requester or department)
- **Notification type**: `query_received`
- **Email sent**: Yes
- **Message**: "{Sender} has requested clarification on '{Request Title}': {Query Message}"

### When Request is Completed
- **Who gets notified**: Requester
- **Notification type**: `request_completed`
- **Email sent**: Yes
- **Message**: "Your request '{Request Title}' has been {approved/rejected}"

## API Endpoints

### GET `/api/notifications`
Get user's notifications with pagination and filtering.

**Query Parameters:**
- `unreadOnly` (boolean) - Only return unread notifications
- `limit` (number) - Number of notifications per page (default: 50)
- `page` (number) - Page number (default: 1)

**Response:**
```json
{
  "notifications": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  },
  "unreadCount": 15
}
```

### PATCH `/api/notifications`
Mark notifications as read.

**Request Body:**
```json
{
  "notificationIds": ["id1", "id2"],  // Array of notification IDs
  "markAllAsRead": false              // Or true to mark all as read
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 notification(s) marked as read"
}
```

### DELETE `/api/notifications?id={notificationId}`
Delete a specific notification.

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

## Database Schema

### Notification Model
```typescript
{
  userId: ObjectId,              // User who receives the notification
  requestId: ObjectId,           // Related request
  type: string,                  // Notification type
  title: string,                 // Notification title
  message: string,               // Notification message
  read: boolean,                 // Read status
  actionUrl: string,             // Link to request details
  metadata: {
    requestTitle: string,
    requestId: string,
    actorName: string,
    actorRole: string,
    status: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ userId: 1, read: 1, createdAt: -1 }` - For efficient queries
- `{ userId: 1 }` - For user-specific queries
- `{ read: 1 }` - For unread count queries

## Email Configuration

### Environment Variables
```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM=noreply@yourdomain.com
```

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASSWORD`

### Email Templates
Email templates are generated dynamically with:
- Branded header with gradient background
- Clear message content
- Action button linking to request
- Footer with app name and copyright

## Usage Examples

### In Components
```typescript
import useSWR from 'swr';

const { data } = useSWR('/api/notifications?limit=10', fetcher, {
  refreshInterval: 30000, // Refresh every 30 seconds
});

const notifications = data?.notifications || [];
const unreadCount = data?.unreadCount || 0;
```

### Sending Notifications (Server-side)
```typescript
import { notifyApprovalPending } from '../lib/notification-service';

// Notify user about pending approval
await notifyApprovalPending(
  userId,
  requestId,
  requestTitle,
  requestorName
);
```

### Marking as Read
```typescript
const markAsRead = async (notificationIds: string[]) => {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationIds }),
  });
};
```

## Integration Points

### 1. Request Creation
- File: `app/api/requests/route.ts`
- Notifies next approvers when request is created

### 2. Request Approval/Rejection
- File: `app/api/requests/[id]/approve/route.ts`
- Notifies requester and next approvers based on action

### 3. Dashboard Layout
- File: `app/dashboard/layout.tsx`
- Displays NotificationBell component in header

## Notification Service Functions

### Core Functions
- `createNotification(data)` - Create in-app notification
- `notifyApprovalPending(userId, requestId, requestTitle, requestorName)` - Notify about pending approval
- `notifyApprovalApproved(requesterId, requestId, requestTitle, approverName, approverRole)` - Notify about approval
- `notifyApprovalRejected(requesterId, requestId, requestTitle, rejectorName, rejectorRole, reason)` - Notify about rejection
- `notifyQueryReceived(targetUserId, requestId, requestTitle, senderName, queryMessage)` - Notify about query
- `notifyRequestCompleted(requesterId, requestId, requestTitle, finalStatus)` - Notify about completion
- `notifyStatusChange(requestId, newStatus, actorId, action, notes)` - Main function that orchestrates all notifications

### Helper Functions
- `getNextApprovers(requestId, newStatus)` - Get list of next approvers
- `sendEmailNotification(email, name, subject, html, text)` - Send email
- `generateEmailTemplate(title, message, actionUrl, actionText, color)` - Generate email HTML

## Best Practices

### 1. Error Handling
- Notifications should never cause request operations to fail
- Always wrap notification calls in try-catch blocks
- Log notification errors but continue with main operation

### 2. Performance
- Use indexes on notification queries
- Limit notification history (consider archiving old notifications)
- Use pagination for notification lists

### 3. User Experience
- Keep notification messages concise and actionable
- Include direct links to relevant pages
- Use appropriate icons and colors for different types
- Auto-refresh notifications periodically

### 4. Email Deliverability
- Use proper email authentication (SPF, DKIM)
- Include unsubscribe option for production
- Test emails in spam filters
- Use transactional email service for production (SendGrid, AWS SES, etc.)

## Testing

### Test Notification Creation
```bash
# Create a test request and verify notifications are sent
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Request",
    "purpose": "Testing notifications",
    "college": "Engineering",
    "department": "Computer Science",
    "costEstimate": 10000,
    "expenseCategory": "Equipment"
  }'
```

### Test Notification Retrieval
```bash
# Get notifications
curl http://localhost:3000/api/notifications?limit=10
```

### Test Mark as Read
```bash
# Mark notification as read
curl -X PATCH http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"notificationIds": ["notification_id_here"]}'
```

## Troubleshooting

### Notifications Not Appearing
1. Check if notification was created in database
2. Verify user ID matches
3. Check browser console for errors
4. Ensure SWR is fetching data correctly

### Emails Not Sending
1. Verify EMAIL_USER and EMAIL_PASSWORD are set
2. Check if Gmail App Password is correct
3. Review server logs for email errors
4. Test SMTP connection manually

### Unread Count Not Updating
1. Check if notifications are being marked as read
2. Verify SWR is revalidating after mutations
3. Check database indexes are created

## Future Enhancements

- [ ] Push notifications for mobile devices
- [ ] Notification preferences (email on/off per type)
- [ ] Notification grouping (combine similar notifications)
- [ ] Notification scheduling (digest emails)
- [ ] Webhook notifications for external systems
- [ ] SMS notifications for critical approvals
- [ ] Slack/Teams integration
- [ ] Notification templates customization
- [ ] Notification analytics dashboard

## Security Considerations

- Notifications respect role-based permissions
- Users can only see their own notifications
- Email content doesn't expose sensitive data
- Notification links require authentication
- Rate limiting on notification API endpoints (recommended for production)

---

**Last Updated**: December 2024
