# Integration Visual Guide

## What Does This Do?

The integration adds a **"Link to ERP/CRM/HR"** button to your request detail pages. This lets you connect approval requests with records in external business systems.

---

## Where You'll See It

### Request Detail Page

```
┌─────────────────────────────────────────────────────┐
│  Request #123456                                     │
│  Purchase Office Supplies                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Request Information:                                │
│  - Requester: John Doe                              │
│  - Department: Computer Science                      │
│  - Cost: ₹5,000                                     │
│                                                      │
│  Attachments:                                        │
│  📄 invoice.pdf                                     │
│  📄 quotation.xlsx                                  │
│                                                      │
│  ┌──────────────────────────────────┐              │
│  │  🔗 Link to ERP/CRM/HR           │  ← NEW!      │
│  └──────────────────────────────────┘              │
│                                                      │
│  [Process Request]  [Raise Query]                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## How It Works

### Step 1: Click the Button

When viewing a request, click **"Link to ERP/CRM/HR"**

### Step 2: Choose System

A modal opens with 3 tabs:

```
┌─────────────────────────────────────────────────────┐
│  Link to External System                      [X]   │
├─────────────────────────────────────────────────────┤
│  [Odoo ERP]  [SuiteCRM]  [OrangeHRM]               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Purchase Orders:                                    │
│  ┌────────────────────────────────────────────┐    │
│  │ PO00042                                     │    │
│  │ ACME Corp • ₹5,000                         │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ PO00043                                     │    │
│  │ XYZ Supplies • ₹3,500                      │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Step 3: Select Record

Click on any record to link it to your request.

### Step 4: Done!

The request is now linked. You can see the link in the request details.

---

## Real-World Examples

### Example 1: Purchase Request

**Scenario:** You need to buy office supplies

1. Create approval request in S.E.A.D.
2. Request gets approved
3. Click "Link to ERP/CRM/HR"
4. Select "Odoo ERP" tab
5. Choose the purchase order (PO00042)
6. Done! Request is linked to PO

**Result:** 
- Request shows link to Odoo PO
- Odoo PO shows link to S.E.A.D. request
- Easy tracking between systems

### Example 2: Customer Contract

**Scenario:** Customer needs a service contract

1. Create approval request for contract
2. Click "Link to ERP/CRM/HR"
3. Select "SuiteCRM" tab
4. Choose customer contact
5. Done! Request linked to customer

**Result:**
- Request shows customer details
- CRM shows linked contract request
- Sales team can track approval status

### Example 3: Employee Document

**Scenario:** Employee needs equipment approval

1. Create approval request
2. Click "Link to ERP/CRM/HR"
3. Select "OrangeHRM" tab
4. Choose employee record
5. Done! Request linked to employee

**Result:**
- Request shows employee info
- HR system shows linked request
- Easy employee document tracking

---

## What Systems Can You Link?

### 1. Odoo ERP (Business Management)
- Purchase orders
- Invoices
- Vendors
- Products

**Use for:** Purchases, invoices, inventory

### 2. SuiteCRM (Customer Management)
- Customer contacts
- Companies
- Deals
- Documents

**Use for:** Customer contracts, sales, support

### 3. OrangeHRM (Employee Management)
- Employee records
- Documents
- Leave requests
- Performance reviews

**Use for:** Employee requests, HR documents

---

## Setup Required

### Option 1: Use Existing Systems

If your organization already has Odoo/CRM/HRM:
1. Get the URL (e.g., https://erp.yourcompany.com)
2. Get credentials from IT
3. Add to `.env.local`
4. Done!

### Option 2: Install New Systems (Free!)

All three systems are free and open-source:

```powershell
# Run this one command:
.\setup-integrations.ps1

# Wait 2 minutes, then configure each system
```

This installs:
- Odoo at http://localhost:8069
- SuiteCRM at http://localhost:8080
- OrangeHRM at http://localhost:8081

---

## Configuration

Add to your `.env.local` file:

```env
# Odoo ERP
ODOO_URL=http://localhost:8069
ODOO_DB=sead_erp
ODOO_USERNAME=admin
ODOO_PASSWORD=admin

# SuiteCRM
SUITECRM_URL=http://localhost:8080
SUITECRM_CLIENT_ID=your-client-id
SUITECRM_CLIENT_SECRET=your-client-secret

# OrangeHRM
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=your-client-id
ORANGEHRM_CLIENT_SECRET=your-client-secret
```

---

## Benefits

### For Requesters
- See which PO/invoice your request is linked to
- Track customer/employee connections
- Better visibility

### For Approvers
- Quick access to related records
- Better decision making
- Complete context

### For Administrators
- Centralized tracking
- Audit trail
- Compliance reporting

---

## Is This Required?

**No!** The integration is completely optional.

- Your approval system works fine without it
- You can link some requests and not others
- You can add it later anytime

Think of it as a "nice to have" feature that makes tracking easier.

---

## Quick Start

### 1. Install Systems (5 minutes)
```powershell
.\setup-integrations.ps1
```

### 2. Configure (5 minutes)
- Open each system
- Complete setup wizard
- Copy credentials to `.env.local`

### 3. Test (1 minute)
```bash
npx ts-node scripts/test-integrations.ts
```

### 4. Use It!
- Open any request
- Click "Link to ERP/CRM/HR"
- Select a record
- Done!

---

## Support

- Full guide: `docs/ERP_CRM_HR_INTEGRATION.md`
- Quick start: `docs/INTEGRATION_QUICK_START.md`
- Technical: `docs/INTEGRATION_IMPLEMENTATION_SUMMARY.md`

---

## Summary

**What:** Button to link requests with Odoo/CRM/HRM records

**Where:** Request detail page, after attachments

**Why:** Better tracking, more context, easier management

**Cost:** Free (all systems are open-source)

**Required:** No (completely optional)

**Setup Time:** 10 minutes

