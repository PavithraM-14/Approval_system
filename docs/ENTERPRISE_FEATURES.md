# Enterprise Features - Integration & Governance

This document describes the enterprise-grade features implemented in S.E.A.D. for compliance, audit, and data governance.

## Features Overview

### 1. Audit Logging System
Complete tracking of all system activities for compliance and security.

### 2. Retention Policies
Automated document lifecycle management with configurable retention rules.

### 3. GDPR Compliance
Data export and deletion capabilities for regulatory compliance.

### 4. Enhanced Email Integration
Automated notifications and reminders with audit trails.

---

## 1. Audit Logging System

### What It Does
Tracks every action in the system including:
- Document uploads, views, downloads, deletions
- Request creation, approvals, rejections
- User logins and authentication attempts
- Data exports and deletions
- System configuration changes

### How to Use

**View Audit Logs (Chairman/Chief Director only):**
```bash
GET /api/audit?limit=100&skip=0
```

**Filter by Action:**
```bash
GET /api/audit?action=document_view&startDate=2026-01-01&endDate=2026-03-01
```

**Get Statistics:**
```bash
GET /api/audit?stats=true&startDate=2026-01-01
```

### Audit Log Fields
- `action`: Type of action performed
- `userId`: Who performed the action
- `targetType`: What was affected (request/document/user/system)
- `targetId`: ID of the affected item
- `details`: Additional context
- `ipAddress`: User's IP address
- `userAgent`: Browser/client information
- `timestamp`: When it happened

### Example Response
```json
{
  "logs": [
    {
      "_id": "...",
      "action": "document_view",
      "userId": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "targetType": "document",
      "targetId": "...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-03-01T10:30:00Z"
    }
  ]
}
```

---

## 2. Retention Policies

### What It Does
Automatically manages document lifecycle based on configurable rules:
- **Archive**: Move old documents to archive storage
- **Delete**: Soft-delete documents after retention period
- **Notify**: Send notifications before taking action

### How to Use

**Create a Retention Policy (Chairman only):**
```bash
POST /api/retention/policies
Content-Type: application/json

{
  "name": "Tax Documents - 7 Year Retention",
  "description": "Keep tax-related documents for 7 years",
  "category": "Equipment",
  "retentionPeriodDays": 2555,
  "action": "archive",
  "notifyBeforeDays": 30
}
```

**View All Policies:**
```bash
GET /api/retention/policies
```

**Check Upcoming Retentions:**
```bash
GET /api/retention/policies?upcoming=true
```

**Run Retention Policies (Manual):**
```bash
npm run retention
```

### Retention Actions

1. **ARCHIVE**
   - Marks documents as archived
   - Documents remain in database but hidden from normal views
   - Can be restored if needed

2. **DELETE**
   - Soft-deletes documents
   - Marks as deleted but keeps in database for audit trail
   - Cannot be easily restored

3. **NOTIFY**
   - Sends notifications to relevant users
   - No automatic action taken
   - Allows manual review before deletion

### Example Policy Scenarios

**Scenario 1: Financial Documents**
```json
{
  "name": "Financial Records - 7 Years",
  "category": "Equipment",
  "retentionPeriodDays": 2555,
  "action": "archive",
  "notifyBeforeDays": 90
}
```

**Scenario 2: Rejected Requests**
```json
{
  "name": "Rejected Requests - 1 Year",
  "retentionPeriodDays": 365,
  "action": "delete",
  "notifyBeforeDays": 30
}
```

**Scenario 3: Approved Requests**
```json
{
  "name": "Approved Requests - 5 Years",
  "retentionPeriodDays": 1825,
  "action": "archive",
  "notifyBeforeDays": 60
}
```

### Automated Execution

Set up a scheduled task to run retention policies weekly:

**Windows Task Scheduler:**
```powershell
# Create task to run every Sunday at 2:00 AM
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d `"C:\path\to\SEAD`" && npm run retention"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "SEAD-Retention-Policies" -Action $action -Trigger $trigger
```

---

## 3. GDPR Compliance

### Right to Access (Data Export)

Users can request a complete export of their personal data.

**Export User Data:**
```bash
POST /api/compliance/export-data
Content-Type: application/json

{
  "userId": "user_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "empId": "EMP001",
      "role": "requester"
    },
    "requests": [...],
    "auditLogs": [...],
    "exportDate": "2026-03-01T10:00:00Z"
  }
}
```

### Right to be Forgotten (Data Deletion)

Chairman can anonymize user data for GDPR compliance.

**Delete User Data (Chairman only):**
```bash
POST /api/compliance/delete-data
Content-Type: application/json

{
  "userId": "user_id_here",
  "reason": "GDPR Right to be forgotten request"
}
```

**What Happens:**
- User profile is anonymized (name → "[DELETED USER]")
- Email changed to deleted_[id]@deleted.local
- Account marked as inactive
- Requests remain for audit trail (can be configured)
- Action is logged in audit trail

---

## 4. Enhanced Email Integration

### Current Features
- OTP verification emails
- Password reset emails
- Approval notifications
- Daily reminder emails (with throttling)

### Email Audit Trail
All emails sent are logged in the audit system:
```javascript
await createAuditLog({
  action: AuditAction.DOCUMENT_VIEW,
  userId: recipientId,
  targetType: 'system',
  details: {
    emailType: 'approval_reminder',
    recipient: email,
    subject: subject
  }
});
```

---

## Security & Access Control

### Role-Based Access

| Feature | Requester | Manager | VP | HOI | Dean | Chief Director | Chairman |
|---------|-----------|---------|----|----|------|----------------|----------|
| View Own Audit Logs | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All Audit Logs | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Export Own Data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export Any User Data | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Delete User Data | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Create Retention Policies | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| View Retention Policies | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Database Schema

### AuditLog Collection
```typescript
{
  action: string,           // Type of action
  userId: ObjectId,         // Who performed it
  targetType: string,       // What was affected
  targetId: ObjectId,       // ID of affected item
  details: object,          // Additional context
  ipAddress: string,        // User's IP
  userAgent: string,        // Browser info
  success: boolean,         // Was it successful
  errorMessage: string,     // Error if failed
  createdAt: Date,          // When it happened
  updatedAt: Date
}
```

### RetentionPolicy Collection
```typescript
{
  name: string,                  // Policy name
  description: string,           // Description
  documentType: string,          // Type of document
  category: string,              // Expense category
  retentionPeriodDays: number,   // How long to keep
  action: string,                // archive/delete/notify
  isActive: boolean,             // Is policy active
  notifyBeforeDays: number,      // Notify X days before
  createdBy: ObjectId,           // Who created it
  createdAt: Date,
  updatedAt: Date
}
```

### Request Model Updates
```typescript
{
  // ... existing fields ...
  archived: boolean,        // Is archived
  archivedAt: Date,        // When archived
  deleted: boolean,        // Is deleted
  deletedAt: Date,         // When deleted
  retentionDate: Date      // When retention applies
}
```

---

## Best Practices

### 1. Audit Log Retention
- Keep audit logs for at least 7 years for compliance
- Regularly backup audit logs
- Monitor for suspicious activities

### 2. Retention Policies
- Start with conservative retention periods
- Test policies on non-production data first
- Always notify before deleting
- Keep backups before applying deletion policies

### 3. GDPR Compliance
- Respond to data export requests within 30 days
- Document all data deletion requests
- Maintain audit trail of all GDPR actions
- Regular compliance audits

### 4. Email Integration
- Monitor email delivery rates
- Keep email logs for troubleshooting
- Use email throttling to prevent spam
- Implement email bounce handling

---

## Troubleshooting

### Audit Logs Not Appearing
1. Check if audit-service is imported in API routes
2. Verify MongoDB connection
3. Check user permissions
4. Review error logs

### Retention Policies Not Running
1. Verify scheduled task is active
2. Check MongoDB connection
3. Review policy configuration
4. Check logs: `logs/retention.log`

### GDPR Export Fails
1. Verify user exists
2. Check permissions
3. Ensure all related collections are accessible
4. Review error logs

---

## Future Enhancements

### Planned Features
1. **Office Suite Integration**
   - Microsoft Office 365 integration
   - Google Workspace integration
   - Direct document editing

2. **ERP/CRM Integration**
   - SAP integration
   - Salesforce integration
   - Custom API connectors

3. **Advanced Backup**
   - Automated daily backups
   - Point-in-time recovery
   - Cloud backup integration

4. **Enhanced Compliance**
   - HIPAA compliance features
   - SOX compliance reporting
   - Custom compliance frameworks

---

## Support

For questions or issues:
1. Check the logs: `logs/` directory
2. Review audit logs: `/api/audit`
3. Contact system administrator
4. Review documentation: `docs/` directory
