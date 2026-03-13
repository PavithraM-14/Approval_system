# Analytics Dashboard - Quick Start

## 🚀 Get Started in 3 Steps

### Step 1: Seed the Database
```bash
# First, create basic system data
npm run seed

# Then, populate analytics data
npm run analytics
```

### Step 2: Start the Server
```bash
npm run dev
```

### Step 3: Login & View
- URL: `http://localhost:3000/login`
- Email: `admin@dmas.com`
- Password: `adminPassword123`
- Navigate to: **Analytics** in sidebar

---

## 📊 What You'll See

### Top KPIs (4 Cards)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Avg Approval    │ Documents       │ Overdue         │ MoM Change      │
│ Time: 2.5 days  │ Pending: 15     │ Count: 3        │ Volume: +12%    │
│ ↓ 15% faster    │ ↑ 5% higher     │ ↓ 10% lower     │ Active Growth   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Document Pipeline (Funnel)
```
Draft → Submitted → Under Review → Approved → Rejected
  0        5            10           25         3
```

### Aging Report (Table)
Shows requests waiting for approval with SLA status:
- 🟢 Green = On Track
- 🟡 Amber = Approaching SLA
- 🔴 Red = Overdue

### Forwarder Performance (Table)
Tracks who's processing requests and how fast:
- Average response time
- Monthly volume
- Current queue size
- Highlights slowest performer

### SLA Compliance Trend (Chart)
12-week line chart showing compliance percentage over time with 85% target line.

---

## 🎯 Key Metrics Explained

| Metric | What It Means | Good Target |
|--------|---------------|-------------|
| **Avg Approval Time** | Days from submission to completion | < 3 days |
| **Documents Pending** | Requests currently in progress | Stable or decreasing |
| **Overdue Count** | Requests past SLA deadline | < 5% of total |
| **SLA Compliance** | % completed within target time | > 85% |
| **Forwarder Avg Response** | Hours to process a request | < 24 hours |

---

## 🔍 Common Use Cases

### Find Bottlenecks
1. Check **Document Pipeline** for accumulation
2. Review **Aging Report** for stuck requests
3. Identify slow forwarders in **Performance Table**

### Monitor SLA Health
1. Watch **Overdue Count** KPI
2. Track **SLA Compliance Trend** chart
3. Set alerts when compliance < 85%

### Plan Capacity
1. Analyze **MoM Change** for volume trends
2. Review **Forwarder Queue Sizes**
3. Identify departments needing resources

---

## 📦 Dummy Data Created

The `npm run analytics` command creates:

- **9 Users**:
  - 5 Requesters (John Smith, Sarah Johnson, Michael Brown, Emily Davis, David Wilson)
  - 4 Approvers (Robert Taylor, Jennifer Martinez, William Anderson, Lisa Thomas)

- **50 Requests**:
  - Distributed across 90 days
  - Various statuses (Submitted, Under Review, Approved, Rejected)
  - Multiple departments (IT, HR, Finance, Operations)
  - Different expense categories

---

## 🛠️ Customization

### Change SLA Targets
Edit `app/api/analytics/sla/route.ts`:
```typescript
const SLA_TARGETS = {
  manager_review: 24,    // hours
  budget_check: 48,
  vp_approval: 72,
  // ...
};
```

### Add More Dummy Data
Edit `scripts/seed-analytics.ts` and change:
```typescript
for (let i = 0; i < 50; i++) {  // Change 50 to desired count
  // ...
}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No data showing | Run `npm run analytics` |
| 401 Unauthorized | Login as admin@dmas.com |
| 404 Analytics page | Check you're logged in as System Admin |
| Slow loading | Check MongoDB connection |

---

## 📚 Full Documentation

For detailed information, see [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md)

---

## 🎨 Dashboard Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  Analytics Dashboard                    [Filters: Dept | Type]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [KPI Cards: Avg Time | Pending | Overdue | MoM Change]         │
│                                                                   │
│  Document Pipeline                                               │
│  ○ → ○ → ○ → ○ → ○                                              │
│                                                                   │
│  ┌─────────────────────┬─────────────────────┐                  │
│  │ Aging Report        │ Forwarder Perf      │                  │
│  │ [Table with docs]   │ [Table with users]  │                  │
│  └─────────────────────┴─────────────────────┘                  │
│                                                                   │
│  SLA Compliance Trend (Last 12 Weeks)                           │
│  [Line Chart: 60-100% compliance over time]                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

**Ready to explore?** Run the commands above and start analyzing your approval system! 🚀
