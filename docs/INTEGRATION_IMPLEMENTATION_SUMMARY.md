# ERP/CRM/HR Integration Implementation Summary

Complete implementation of Odoo ERP, SuiteCRM, and OrangeHRM integrations for the S.E.A.D. approval system.

---

## ✅ What Was Implemented

### 1. API Endpoints

#### Odoo ERP
- `GET /api/odoo/purchase-orders` - List purchase orders with filters
- `GET /api/odoo/invoices` - List invoices with filters
- `POST /api/odoo/invoices` - Create new invoice
- `GET /api/odoo/partners` - List vendors/customers

#### SuiteCRM
- `GET /api/suitecrm/contacts` - List contacts with filters
- `GET /api/suitecrm/contacts/[id]/documents` - Get contact documents
- `POST /api/suitecrm/contacts/[id]/documents` - Link document to contact

#### OrangeHRM
- `GET /api/orangehrm/employees` - List employees with filters
- `GET /api/orangehrm/employees/[id]/documents` - Get employee documents
- `POST /api/orangehrm/employees/[id]/documents` - Link document to employee

#### Request Linking
- `POST /api/requests/[id]/link` - Link request to external system
- `GET /api/requests/[id]/link` - Get all links for a request

### 2. Service Clients

All three service clients already existed with complete implementations:
- `lib/odoo-service.ts` - Odoo XML-RPC client
- `lib/suitecrm-service.ts` - SuiteCRM REST API client
- `lib/orangehrm-service.ts` - OrangeHRM REST API client

### 3. UI Components

Created `components/IntegrationLinks.tsx`:
- Modal with tabs for Odoo/CRM/HRM
- Search and filter records
- One-click linking to external systems
- View linked records

### 4. Database Schema

Updated `models/Request.ts` to include:
```typescript
integrationLinks: [{
  type: 'odoo_po' | 'odoo_invoice' | 'crm_contact' | 'hrm_employee',
  externalId: string,
  externalUrl: string,
  linkedAt: Date,
  linkedBy: ObjectId
}]
```

### 5. Documentation

Created comprehensive guides:
- `docs/ERP_CRM_HR_INTEGRATION.md` - Complete setup and usage guide
- `docs/INTEGRATIONS_SETUP_GUIDE.md` - Quick start guide (already existed)

### 6. Testing & Setup

- `scripts/test-integrations.ts` - Test all three integrations
- `setup-integrations.ps1` - PowerShell script to setup Docker containers

### 7. Environment Configuration

Updated `.env.example` with all required variables:
```env
# Odoo ERP
ODOO_URL=http://localhost:8069
ODOO_DB=sead_erp
ODOO_USERNAME=admin
ODOO_PASSWORD=admin

# SuiteCRM
SUITECRM_URL=http://localhost:8080
SUITECRM_USERNAME=admin
SUITECRM_PASSWORD=admin
SUITECRM_CLIENT_ID=your-client-id
SUITECRM_CLIENT_SECRET=your-client-secret

# OrangeHRM
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=your-client-id
ORANGEHRM_CLIENT_SECRET=your-client-secret
ORANGEHRM_USERNAME=admin
ORANGEHRM_PASSWORD=admin
```

---

## 🚀 How to Use

### Quick Setup (5 minutes)

1. **Start all systems:**
   ```powershell
   .\setup-integrations.ps1
   ```

2. **Configure each system:**
   - Odoo: http://localhost:8069 (create database "sead_erp")
   - SuiteCRM: http://localhost:8080 (create OAuth client)
   - OrangeHRM: http://localhost:8081 (register OAuth client)

3. **Update .env.local** with credentials

4. **Test connections:**
   ```bash
   npx ts-node scripts/test-integrations.ts
   ```

### Using in UI

Add to request detail page (`app/dashboard/requests/[id]/page.tsx`):

```tsx
import IntegrationLinks from '@/components/IntegrationLinks';

// Inside the component, after the request details section:
<div className="mt-6">
  <IntegrationLinks 
    requestId={request.requestId}
    onLink={async (type, id) => {
      const response = await fetch(`/api/requests/${request.requestId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          externalId: id,
          externalUrl: getExternalUrl(type, id)
        })
      });
      
      if (response.ok) {
        alert('Successfully linked!');
        // Refresh request data
        fetchRequest();
      }
    }}
  />
</div>
```

Helper function for URLs:
```tsx
function getExternalUrl(type: string, id: string): string {
  switch (type) {
    case 'odoo_po':
      return `http://localhost:8069/web#id=${id}&model=purchase.order`;
    case 'odoo_invoice':
      return `http://localhost:8069/web#id=${id}&model=account.move`;
    case 'crm_contact':
      return `http://localhost:8080/index.php?module=Contacts&action=DetailView&record=${id}`;
    case 'hrm_employee':
      return `http://localhost:8081/index.php/pim/viewEmployee/empNumber/${id}`;
    default:
      return '';
  }
}
```

---

## 📋 Integration Workflows

### Workflow 1: Purchase Request → Odoo

1. User creates approval request
2. Request gets approved
3. Approver clicks "Link to ERP/CRM/HR"
4. Selects Odoo tab
5. Chooses purchase order
6. System links request to PO
7. Documents automatically attached to PO in Odoo

### Workflow 2: Contract → CRM Contact

1. User creates contract approval request
2. Approver links to CRM contact
3. System creates note in SuiteCRM with document link
4. Contact record shows linked S.E.A.D. document

### Workflow 3: Employee Document → OrangeHRM

1. User creates employee-related request
2. HR approver links to employee record
3. System creates document reference in OrangeHRM
4. Employee record shows linked S.E.A.D. document

---

## 🔧 API Usage Examples

### Link Request to Purchase Order

```typescript
const response = await fetch('/api/requests/123456/link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'odoo_po',
    externalId: '42',
    externalUrl: 'http://localhost:8069/web#id=42&model=purchase.order'
  })
});
```

### Get All Links for Request

```typescript
const response = await fetch('/api/requests/123456/link');
const { links } = await response.json();

// links = [
//   {
//     type: 'odoo_po',
//     externalId: '42',
//     externalUrl: 'http://...',
//     linkedAt: '2024-01-01T00:00:00Z',
//     linkedBy: { name: 'John Doe', email: 'john@example.com' }
//   }
// ]
```

### Get Odoo Purchase Orders

```typescript
const response = await fetch('/api/odoo/purchase-orders?state=purchase');
const { data } = await response.json();

// data = [
//   {
//     id: 42,
//     name: 'PO00042',
//     partner_id: [1, 'ACME Corp'],
//     amount_total: 5000,
//     state: 'purchase'
//   }
// ]
```

---

## 🎯 Features

### Odoo Integration
- ✅ List purchase orders
- ✅ List invoices
- ✅ Create invoices
- ✅ List vendors/customers
- ✅ Link documents to POs
- ✅ Search and filter

### SuiteCRM Integration
- ✅ List contacts
- ✅ List accounts
- ✅ Get contact documents
- ✅ Link documents to contacts
- ✅ Search by email/account

### OrangeHRM Integration
- ✅ List employees
- ✅ Get employee documents
- ✅ Link documents to employees
- ✅ Search by name/ID
- ✅ Get job titles/departments

---

## 🔒 Security

All integrations use:
- Environment variables for credentials
- JWT authentication for API endpoints
- User authorization checks
- Secure OAuth flows (SuiteCRM, OrangeHRM)
- XML-RPC authentication (Odoo)

---

## 💰 Cost

**Total: $0/month**

All systems are open-source and self-hosted:
- Odoo: Free (Community Edition)
- SuiteCRM: Free (Open Source)
- OrangeHRM: Free (Open Source)

---

## 📊 System Requirements

### Docker Containers
- Odoo: ~500MB RAM, 2GB disk
- SuiteCRM: ~512MB RAM, 1GB disk
- OrangeHRM: ~512MB RAM, 1GB disk

### Total Resources
- RAM: ~1.5GB
- Disk: ~4GB
- Ports: 8069, 8080, 8081

---

## 🐛 Troubleshooting

### Odoo Connection Failed
```bash
# Check if running
docker ps | grep odoo

# Check logs
docker logs odoo

# Restart
docker restart odoo
```

### SuiteCRM Authentication Failed
- Verify OAuth client exists in Admin → OAuth2 Clients
- Check CLIENT_ID and CLIENT_SECRET match
- Ensure API is enabled in System Settings

### OrangeHRM Access Denied
- Verify OAuth client is registered
- Check API module is enabled
- Verify user has API access permissions

---

## 📚 Additional Resources

- [Odoo API Documentation](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- [SuiteCRM API Guide](https://docs.suitecrm.com/developer/api/)
- [OrangeHRM API Docs](https://orangehrm.github.io/orangehrm-api-doc/)

---

## ✅ Testing Checklist

- [ ] Docker containers running
- [ ] Environment variables configured
- [ ] Odoo database created
- [ ] SuiteCRM OAuth client created
- [ ] OrangeHRM OAuth client registered
- [ ] Test script passes: `npx ts-node scripts/test-integrations.ts`
- [ ] API endpoints accessible
- [ ] IntegrationLinks component added to UI
- [ ] Can link request to Odoo PO
- [ ] Can link request to CRM contact
- [ ] Can link request to HRM employee
- [ ] Links display correctly
- [ ] External URLs work

---

## 🎉 Next Steps

1. **Add IntegrationLinks component** to request detail page
2. **Train users** on linking workflow
3. **Monitor integration logs** for errors
4. **Set up automated syncs** (optional)
5. **Configure webhooks** for real-time updates (optional)
6. **Add more integration types** as needed

---

## 📝 Notes

- All integrations are optional - system works without them
- Links are stored in MongoDB for audit trail
- External systems remain source of truth
- S.E.A.D. only stores references, not copies
- Users need appropriate permissions in external systems
- Integration links are visible to all users who can view the request

