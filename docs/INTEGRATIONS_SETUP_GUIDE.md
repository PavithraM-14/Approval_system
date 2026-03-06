# Complete Integrations Setup Guide

All-in-one guide for setting up Gmail, Google Drive, Odoo ERP, SuiteCRM, and OrangeHRM integrations.

---

## 🎯 Overview

| Integration | Purpose | Cost | Setup Time |
|-------------|---------|------|------------|
| Gmail API | Email automation | FREE | 15 min |
| Google Drive | Document editing | FREE | 15 min |
| Odoo ERP | Purchase orders, invoices | FREE (self-host) | 30 min |
| SuiteCRM | Customer management | FREE (self-host) | 30 min |
| OrangeHRM | Employee documents | FREE (self-host) | 30 min |

**Total Cost: $0** (all free and open-source)

---

## 1️⃣ Gmail API Setup

### Quick Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "SEAD System"
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/gmail/callback`

### Environment Variables
```env
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxx
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

### Features
- ✅ Auto-save email attachments
- ✅ Send documents via email
- ✅ Parse email metadata
- ✅ Monitor inbox

**Full Guide:** See `GMAIL_INTEGRATION_SETUP.md`

---

## 2️⃣ Google Drive API Setup

### Quick Setup
1. Use same Google Cloud project as Gmail
2. Enable Google Drive API
3. Enable Google Docs API
4. Enable Google Sheets API
5. Use same OAuth credentials

### Environment Variables
```env
# Can reuse Gmail credentials
GOOGLE_DRIVE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=xxxxx
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
```

### Features
- ✅ Edit documents in browser
- ✅ Real-time collaboration
- ✅ Auto-save changes
- ✅ Convert Office files to Google format
- ✅ Export to PDF

### Scopes Needed
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/presentations
```

---

## 3️⃣ Odoo ERP Setup (FREE)

### What is Odoo?
Open-source ERP system for:
- Purchase orders
- Invoices
- Inventory management
- Accounting
- Sales

### Installation Options

**Option A: Docker (Recommended)**
```bash
# Pull Odoo image
docker pull odoo:17

# Run Odoo
docker run -d \
  -p 8069:8069 \
  --name odoo \
  -e POSTGRES_USER=odoo \
  -e POSTGRES_PASSWORD=odoo \
  -e POSTGRES_DB=postgres \
  odoo:17
```

**Option B: Windows Installer**
1. Download from [Odoo.com](https://www.odoo.com/page/download)
2. Run installer
3. Access at `http://localhost:8069`

### Initial Setup
1. Open `http://localhost:8069`
2. Create database: "sead_erp"
3. Set master password
4. Install modules:
   - Purchase
   - Invoicing
   - Inventory

### API Configuration
```env
ODOO_URL=http://localhost:8069
ODOO_DB=sead_erp
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
```

### API Usage
```typescript
// Connect to Odoo
const odoo = new OdooClient({
  url: process.env.ODOO_URL,
  db: process.env.ODOO_DB,
  username: process.env.ODOO_USERNAME,
  password: process.env.ODOO_PASSWORD,
});

// Get purchase orders
const orders = await odoo.search('purchase.order', [
  ['state', '=', 'purchase']
]);

// Create invoice
const invoice = await odoo.create('account.move', {
  partner_id: customerId,
  invoice_date: new Date(),
  invoice_line_ids: [...]
});
```

---

## 4️⃣ SuiteCRM Setup (FREE)

### What is SuiteCRM?
Open-source CRM for:
- Customer management
- Contact tracking
- Deal pipeline
- Document attachment

### Installation Options

**Option A: Docker (Recommended)**
```bash
# Pull SuiteCRM image
docker pull bitnami/suitecrm:latest

# Run SuiteCRM
docker run -d \
  -p 8080:8080 \
  --name suitecrm \
  -e SUITECRM_DATABASE_HOST=localhost \
  -e SUITECRM_DATABASE_NAME=suitecrm \
  -e SUITECRM_DATABASE_USER=root \
  -e SUITECRM_DATABASE_PASSWORD=password \
  bitnami/suitecrm:latest
```

**Option B: Manual Install**
1. Download from [SuiteCRM.com](https://suitecrm.com/download/)
2. Extract to web server
3. Run installer
4. Access at `http://localhost/suitecrm`

### API Configuration
```env
SUITECRM_URL=http://localhost:8080
SUITECRM_USERNAME=admin
SUITECRM_PASSWORD=admin
SUITECRM_CLIENT_ID=xxxxx
SUITECRM_CLIENT_SECRET=xxxxx
```

### API Setup
1. Go to Admin → OAuth2 Clients
2. Create new client
3. Copy Client ID and Secret
4. Set redirect URI

### API Usage
```typescript
// Connect to SuiteCRM
const crm = new SuiteCRMClient({
  url: process.env.SUITECRM_URL,
  clientId: process.env.SUITECRM_CLIENT_ID,
  clientSecret: process.env.SUITECRM_CLIENT_SECRET,
});

// Get contacts
const contacts = await crm.getContacts({
  filter: { account_name: 'ACME Corp' }
});

// Attach document to contact
await crm.attachDocument(contactId, {
  filename: 'contract.pdf',
  content: buffer,
});
```

---

## 5️⃣ OrangeHRM Setup (FREE)

### What is OrangeHRM?
Open-source HR system for:
- Employee records
- Document management
- Leave tracking
- Performance reviews

### Installation Options

**Option A: Docker (Recommended)**
```bash
# Pull OrangeHRM image
docker pull orangehrm/orangehrm:latest

# Run OrangeHRM
docker run -d \
  -p 8081:80 \
  --name orangehrm \
  -e ORANGEHRM_DATABASE_HOST=localhost \
  -e ORANGEHRM_DATABASE_NAME=orangehrm \
  -e ORANGEHRM_DATABASE_USER=root \
  -e ORANGEHRM_DATABASE_PASSWORD=password \
  orangehrm/orangehrm:latest
```

**Option B: Manual Install**
1. Download from [OrangeHRM.com](https://www.orangehrm.com/open-source-hr-software)
2. Extract to web server
3. Run installer
4. Access at `http://localhost:8081`

### API Configuration
```env
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=xxxxx
ORANGEHRM_CLIENT_SECRET=xxxxx
```

### API Setup
1. Go to Admin → Configuration → Register OAuth Client
2. Create new client
3. Copy credentials
4. Enable API access

### API Usage
```typescript
// Connect to OrangeHRM
const hrm = new OrangeHRMClient({
  url: process.env.ORANGEHRM_URL,
  clientId: process.env.ORANGEHRM_CLIENT_ID,
  clientSecret: process.env.ORANGEHRM_CLIENT_SECRET,
});

// Get employees
const employees = await hrm.getEmployees();

// Upload employee document
await hrm.uploadDocument(employeeId, {
  type: 'contract',
  filename: 'employment_contract.pdf',
  content: buffer,
});
```

---

## 📦 Complete Environment Variables

Add all these to your `.env.local`:

```env
# Gmail API
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxx
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Google Drive API (can reuse Gmail credentials)
GOOGLE_DRIVE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=xxxxx
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# Odoo ERP
ODOO_URL=http://localhost:8069
ODOO_DB=sead_erp
ODOO_USERNAME=admin
ODOO_PASSWORD=admin

# SuiteCRM
SUITECRM_URL=http://localhost:8080
SUITECRM_USERNAME=admin
SUITECRM_PASSWORD=admin
SUITECRM_CLIENT_ID=xxxxx
SUITECRM_CLIENT_SECRET=xxxxx

# OrangeHRM
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=xxxxx
ORANGEHRM_CLIENT_SECRET=xxxxx
```

---

## 🚀 Quick Start Commands

### Install All Dependencies
```bash
npm install googleapis odoo-xmlrpc suitecrm-js-sdk orangehrm-api-client
```

### Start All Services (Docker)
```bash
# Start Odoo
docker start odoo

# Start SuiteCRM
docker start suitecrm

# Start OrangeHRM
docker start orangehrm

# Start your app
npm run dev
```

### Test Connections
```bash
# Test Gmail
curl http://localhost:3000/api/gmail/auth

# Test Google Drive
curl http://localhost:3000/api/google-drive/auth

# Test Odoo
curl http://localhost:8069/web/database/selector

# Test SuiteCRM
curl http://localhost:8080

# Test OrangeHRM
curl http://localhost:8081
```

---

## 🔗 Integration Flow Examples

### Example 1: Email → Document Library
```
1. Receive email with invoice attachment
2. Gmail API extracts attachment
3. Upload to Google Drive
4. Create document record in S.E.A.D.
5. Link to Odoo purchase order
6. Notify approver
```

### Example 2: Contract Management
```
1. Create contract in Google Docs
2. Share with customer via Gmail
3. Customer signs and returns
4. Save to S.E.A.D. document library
5. Link to SuiteCRM contact
6. Update deal status
```

### Example 3: Employee Onboarding
```
1. New employee in OrangeHRM
2. Generate employment contract (Google Docs)
3. Send for signature via Gmail
4. Save signed contract to S.E.A.D.
5. Link to employee record
6. Trigger onboarding workflow
```

---

## 🛠️ Troubleshooting

### Gmail/Drive: "Invalid credentials"
- Check Client ID and Secret in `.env.local`
- Verify redirect URI matches exactly
- Ensure APIs are enabled in Google Cloud

### Odoo: "Connection refused"
- Check if Odoo is running: `docker ps`
- Verify URL and port
- Check database credentials

### SuiteCRM: "Authentication failed"
- Verify OAuth client is created
- Check username and password
- Ensure API is enabled

### OrangeHRM: "Access denied"
- Check OAuth client credentials
- Verify API access is enabled
- Check user permissions

---

## 📊 Feature Matrix

| Feature | Gmail | Drive | Odoo | SuiteCRM | OrangeHRM |
|---------|-------|-------|------|----------|-----------|
| Document Upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| Document Edit | ❌ | ✅ | ❌ | ❌ | ❌ |
| Real-time Collab | ❌ | ✅ | ❌ | ❌ | ❌ |
| Email Integration | ✅ | ❌ | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Free Tier | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 💰 Total Cost Breakdown

| Service | Setup | Monthly | Annual |
|---------|-------|---------|--------|
| Gmail API | $0 | $0 | $0 |
| Google Drive | $0 | $0 | $0 |
| Odoo (self-host) | $0 | $0 | $0 |
| SuiteCRM (self-host) | $0 | $0 | $0 |
| OrangeHRM (self-host) | $0 | $0 | $0 |
| **TOTAL** | **$0** | **$0** | **$0** |

**100% FREE!** 🎉

---

## 📚 Additional Resources

- [Gmail API Docs](https://developers.google.com/gmail/api)
- [Google Drive API Docs](https://developers.google.com/drive)
- [Odoo Documentation](https://www.odoo.com/documentation)
- [SuiteCRM API Guide](https://docs.suitecrm.com/developer/api/)
- [OrangeHRM API Docs](https://orangehrm.github.io/orangehrm-api-doc/)

---

## ✅ Setup Checklist

- [ ] Gmail API credentials obtained
- [ ] Google Drive API enabled
- [ ] Odoo installed and running
- [ ] SuiteCRM installed and running
- [ ] OrangeHRM installed and running
- [ ] All environment variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] Connections tested
- [ ] OAuth flows working
- [ ] Webhooks configured

---

## 🎯 Next Steps

1. Complete Gmail setup (15 min)
2. Enable Google Drive (5 min)
3. Install Odoo via Docker (10 min)
4. Install SuiteCRM via Docker (10 min)
5. Install OrangeHRM via Docker (10 min)
6. Test all integrations
7. Configure automation rules
8. Train users

**Total Time: ~1 hour for complete setup!**
