# Analytics Dashboard Guide

## Overview

The Analytics Dashboard provides comprehensive insights into your approval system's performance, helping System Admins track SLA compliance, identify bottlenecks, and optimize workflows.

## Setup

### Prerequisites
1. Ensure you have run the basic seed script first:
   ```bash
   npm run seed
   ```

2. Seed the analytics data:
   ```bash
   npm run analytics
   ```

### What Gets Created

The analytics seeding script creates:
- **5 Requester Users** across different departments (IT, HR, Finance, Operations)
- **4 Approver/Forwarder Users** for processing requests
- **50 Dummy Requests** with varied:
  - Statuses (Submitted, Under Review, Approved, Rejected)
  - Timelines (last 90 days)
  - Departments and expense categories
  - Approval histories

## Accessing the Dashboard

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Login as System Admin:
   - URL: `http://localhost:3000/login`
   - Email: `admin@dmas.com`
   - Password: `adminPassword123`

3. Navigate to Analytics:
   - Click "Analytics" in the sidebar
   - Or visit: `http://localhost:3000/dashboard/analytics`

## Dashboard Features

### 1. Header KPI Strip

Four key performance indicators displayed at the top:

#### Average Approval Time
- **Metric**: Average days to complete a request
- **Calculation**: Total hours from creation to completion ÷ number of completed requests
- **Trend**: Shows percentage change vs last month
- **Color**: Blue border

#### Documents Pending
- **Metric**: Total number of in-progress requests
- **Calculation**: Count of all non-completed requests
- **Trend**: Shows percentage change vs last month
- **Color**: Indigo border

#### Overdue Count
- **Metric**: Number of requests exceeding SLA targets
- **Calculation**: Requests where time elapsed > SLA threshold
- **SLA Targets**:
  - Manager Review: 24 hours
  - Budget Check: 48 hours
  - VP Approval: 72 hours
  - Dean Review: 48 hours
  - Other stages: 48-96 hours
- **Color**: Red border

#### MoM Change (Volume)
- **Metric**: Month-over-month change in request volume
- **Calculation**: ((This Month - Last Month) / Last Month) × 100
- **Trend**: Indicates growth or decline
- **Color**: Emerald border

### 2. Document Pipeline

Visual funnel showing request distribution across stages:

- **Draft**: Requests not yet submitted
- **Submitted**: Initial submission stage
- **Under Review**: Active approval process
- **Approved**: Successfully completed
- **Rejected**: Denied requests

**Features**:
- Circular badges with counts
- Highlights stages with high volume (>10 requests)
- Visual flow indicator connecting stages

### 3. Aging Report

Table showing in-flight documents and their wait times:

**Columns**:
- **Document**: Request title
- **Type**: Expense category or request type
- **Stage**: Current approval stage
- **Days Wait**: Days since last update
- **Status**: SLA compliance indicator
  - 🟢 **Green (On Track)**: < 75% of SLA target
  - 🟡 **Amber (Approaching SLA)**: 75-100% of SLA target
  - 🔴 **Red (Overdue)**: > 100% of SLA target

**Features**:
- Shows top 3 by default
- "View All" button to expand full list
- Hover effects for better UX
- Truncated stage names with tooltips

### 4. Forwarder Performance

Table tracking approver/forwarder efficiency:

**Columns**:
- **Forwarder Name**: User who forwards/approves
- **Avg Response (h)**: Average hours to process a request
- **Processed/Mo**: Number of requests handled this month
- **Queue Size**: Current pending requests (simulated)

**Features**:
- Highlights slowest performer with "Needs Attention" badge
- Red background for slowest responder
- Orange text for high queue sizes (>10)
- Shows top 3 by default with "View All" option

### 5. SLA Compliance Trend

Line chart showing compliance over the last 12 weeks:

**Features**:
- **X-Axis**: Week numbers (W1-W12)
- **Y-Axis**: Compliance percentage (60-100%)
- **Target Line**: Red dashed line at 85% compliance
- **Data Points**: Blue dots showing weekly compliance
- **Calculation**: (Requests completed within SLA / Total requests) × 100
- **Hover Tooltip**: Shows exact compliance percentage

## Filters

The dashboard includes four filter dropdowns (UI only, not yet functional):

1. **Department Filter**: IT, HR, Finance, Operations
2. **Document Type Filter**: Budget, Contract, Policy
3. **Date Range Filter**: Last 30/90 Days, This Year
4. **Approver Filter**: Filter by specific approver

## Data API

### Endpoint
```
GET /api/analytics/sla
```

### Response Structure
```json
{
  "success": true,
  "metrics": {
    "averageTurnaroundHours": 48,
    "documentsPending": 15,
    "overdueCount": 3,
    "momChange": 12,
    "pipeline": {
      "Draft": 0,
      "Submitted": 5,
      "UnderReview": 10,
      "Approved": 25,
      "Rejected": 3
    },
    "agingReport": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Budget Approval - 1",
        "type": "IT Equipment",
        "status": "green",
        "stage": "Manager Review",
        "daysWaiting": 2,
        "approver": "Pending"
      }
    ],
    "forwarderPerformance": [
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "Robert Taylor",
        "docsProcessed": 12,
        "avgResponse": 18,
        "queueSize": 3,
        "slowest": false
      }
    ],
    "slaTrend": [
      {
        "week": "W1",
        "compliance": 87
      }
    ]
  }
}
```

## How It Works

### Data Collection

1. **Request Tracking**: Every request stores:
   - Creation timestamp
   - Last update timestamp
   - Current status
   - Approval history with actor and timestamps

2. **SLA Calculation**:
   ```typescript
   const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60);
   const slaTarget = SLA_TARGETS[status] || 48;
   const isOverdue = hoursElapsed > slaTarget;
   ```

3. **Trend Analysis**:
   - Groups requests by week
   - Calculates completion time vs SLA target
   - Computes compliance percentage

### Performance Metrics

**Forwarder Performance**:
```typescript
// For each forwarder
for (const log of request.history) {
  if (log.action === 'FORWARD' && log.actor === forwarderId) {
    const responseTime = log.timestamp - previousTimestamp;
    totalResponseHours += responseTime;
    forwardedCount++;
  }
}
avgResponse = totalResponseHours / forwardedCount;
```

**MoM Change**:
```typescript
const thisMonth = requests.filter(r => 
  r.createdAt >= thirtyDaysAgo && r.status === 'APPROVED'
).length;

const lastMonth = requests.filter(r => 
  r.createdAt >= sixtyDaysAgo && 
  r.createdAt < thirtyDaysAgo && 
  r.status === 'APPROVED'
).length;

const momChange = ((thisMonth - lastMonth) / lastMonth) * 100;
```

## Use Cases

### 1. Identifying Bottlenecks
- Check **Aging Report** for requests stuck in specific stages
- Look for patterns in **Document Pipeline** accumulation
- Review **Forwarder Performance** for slow responders

### 2. SLA Monitoring
- Track **Overdue Count** KPI
- Monitor **SLA Compliance Trend** chart
- Set alerts when compliance drops below 85%

### 3. Capacity Planning
- Analyze **MoM Change** for volume trends
- Review **Forwarder Performance** queue sizes
- Identify departments with high request volumes

### 4. Process Optimization
- Compare **Average Approval Time** across periods
- Identify stages with longest wait times
- Optimize workflows based on data insights

## Customization

### Adjusting SLA Targets

Edit `app/api/analytics/sla/route.ts`:

```typescript
const SLA_TARGETS: Record<string, number> = {
  [RequestStatus.MANAGER_REVIEW]: 24,  // Change to your target
  [RequestStatus.BUDGET_CHECK]: 48,
  // Add more stages...
};
```

### Adding New Metrics

1. Update the API response in `app/api/analytics/sla/route.ts`
2. Add new UI components in `app/dashboard/analytics/page.tsx`
3. Use Recharts for visualizations

### Implementing Filters

The filter UI is ready. To make it functional:

1. Add filter state to API call:
```typescript
const fetchSLAData = async () => {
  const params = new URLSearchParams({
    department: filterDepartment,
    docType: filterDocType,
    dateRange: filterDateRange,
    approver: filterApprover
  });
  const response = await fetch(`/api/analytics/sla?${params}`);
  // ...
};
```

2. Update API to handle query parameters
3. Filter data based on parameters

## Troubleshooting

### No Data Showing
- Ensure you ran `npm run analytics`
- Check browser console for API errors
- Verify MongoDB connection

### Incorrect Calculations
- Check request timestamps in database
- Verify SLA_TARGETS configuration
- Review history logs for completeness

### Performance Issues
- Add database indexes on `createdAt`, `updatedAt`, `status`
- Implement pagination for large datasets
- Cache analytics data with Redis

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live metrics
2. **Export Reports**: PDF/Excel export functionality
3. **Custom Dashboards**: User-configurable widgets
4. **Predictive Analytics**: ML-based SLA predictions
5. **Alerts**: Email/SMS notifications for SLA breaches
6. **Drill-down**: Click metrics to see detailed breakdowns
7. **Comparison Views**: Compare departments, time periods
8. **Custom Date Ranges**: Flexible date selection

## Best Practices

1. **Regular Monitoring**: Check dashboard daily
2. **Set Baselines**: Establish target metrics
3. **Act on Insights**: Use data to drive improvements
4. **Review Trends**: Weekly/monthly trend analysis
5. **Share Reports**: Export and share with stakeholders
6. **Continuous Improvement**: Adjust SLAs based on reality

## Support

For issues or questions:
- Check application logs
- Review MongoDB data integrity
- Verify user permissions (System Admin only)
- Contact system administrator

---

**Last Updated**: March 2026
**Version**: 1.0.0
