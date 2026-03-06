# ERP/CRM/HR Integration Guide

Complete guide for integrating Odoo ERP, SuiteCRM, and OrangeHRM with the S.E.A.D. approval system.

---

## Overview

Link approval requests with:
- **Odoo ERP**: Purchase orders, invoices, inventory
- **SuiteCRM**: Customer contacts, deals, accounts
- **OrangeHRM**: Employee records, documents, leave

---

## Quick Start

### 1. Install Systems (Docker)

```bash
# Odoo ERP
docker run -d -p 8069:8069 --name odoo odoo:17

# SuiteCRM
docker run -d -p 8080:8080 --name suitecrm bitnami/suitecrm:latest

# OrangeHRM
docker run -d -p 8081:80 --name orangehrm orangehrm/orangehrm:latest
```

### 2. Configure Environment

Add to `.env.local`:

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

### 3. Test Connections

```bash
# Test Odoo
curl http://localhost:3000/api/odoo/partners

# Test SuiteCRM
curl http://localhost:3000/api/suitecrm/contacts

# Test OrangeHRM
curl http://localhost:3000/api/orangehrm/employees
```

---

## Features

### Odoo ERP Integration

**Link requests to:**
- Purchase orders
- Invoices
- Products
- Vendors/customers

**API Endpoints:**
- `GET /api/odoo/purchase-orders` - List purchase orders
- `GET /api/odoo/invoices` - List invoices
- `POST /api/odoo/invoices` - Create invoice
- `GET /api/odoo/partners` - List vendors/customers

**Example Usage:**
```typescript
// Get purchase orders
const response = await fetch('/api/odoo/purchase-orders?state=purchase');
const { data } = await response.json();

// Link request to purchase order
await fetch(`/api/requests/${requestId}/link`, {
  method: 'POST',
  body: JSON.stringify({
    type: 'odoo_po',
    externalId: purchaseOrderId,
    externalUrl: `http://localhost:8069/web#id=${purchaseOrderId}`
  })
});
```

### SuiteCRM Integration

**Link requests to:**
- Customer contacts
- Accounts (companies)
- Opportunities (deals)
- Documents

**API Endpoints:**
- `GET /api/suitecrm/contacts` - List contacts
- `GET /api/suitecrm/contacts/[id]/documents` - Get contact documents
- `POST /api/suitecrm/contacts/[id]/documents` - Link document to contact

**Example Usage:**
```typescript
// Get contacts
const response = await fetch('/api/suitecrm/contacts?email=customer@example.com');
const { data } = await response.json();

// Link request to contact
await fetch(`/api/requests/${requestId}/link`, {
  method: 'POST',
  body: JSON.stringify({
    type: 'crm_contact',
    externalId: contactId,
    externalUrl: `http://localhost:8080/index.php?module=Contacts&action=DetailView&record=${contactId}`
  })
});
```

### OrangeHRM Integration

**Link requests to:**
- Employee records
- Employee documents
- Leave requests
- Performance reviews

**API Endpoints:**
- `GET /api/orangehrm/employees` - List employees
- `GET /api/orangehrm/employees/[id]/documents` - Get employee documents
- `POST /api/orangehrm/employees/[id]/documents` - Link document to employee

**Example Usage:**
```typescript
// Get employees
const response = await fetch('/api/orangehrm/employees?name=John');
const { data } = await response.json();

// Link request to employee
await fetch(`/api/requests/${requestId}/link`, {
  method: 'POST',
  body: JSON.stringify({
    type: 'hrm_employee',
    externalId: empNumber,
    externalUrl: `http://localhost:8081/index.php/pim/viewEmployee/empNumber/${empNumber}`
  })
});
```

---

## UI Components

### IntegrationLinks Component

Add to request detail pages:

```tsx
import IntegrationLinks from '@/components/IntegrationLinks';

<IntegrationLinks 
  requestId={requestId}
  onLink={async (type, id) => {
    await fetch(`/api/requests/${requestId}/link`, {
      method: 'POST',
      body: JSON.stringify({ type, externalId: id })
    });
  }}
/>
```

**Features:**
- Modal with tabs for Odoo/CRM/HRM
- Search and filter records
- One-click linking
- View linked records

---

## Setup Instructions

### Odoo Setup

1. **Install Odoo**
   ```bash
   docker run -d -p 8069:8069 --name odoo odoo:17
   ```

2. **Initial Configuration**
   - Open http://localhost:8069
   - Create database: "sead_erp"
   - Set master password
   - Login with admin/admin

3. **Install Modules**
   - Go to Apps
   - Install: Purchase, Invoicing, Inventory

4. **Enable API Access**
   - Settings → Technical → Database Structure
   - Enable XML-RPC

### SuiteCRM Setup

1. **Install SuiteCRM**
   ```bash
   docker run -d -p 8080:8080 --name suitecrm bitnami/suitecrm:latest
   ```

2. **Initial Configuration**
   - Open http://localhost:8080
   - Complete setup wizard
   - Login with admin credentials

3. **Create OAuth Client**
   - Admin → OAuth2 Clients
   - Create new client
   - Copy Client ID and Secret
   - Add to .env.local

4. **Enable API**
   - Admin → System Settings
   - Enable API access

### OrangeHRM Setup

1. **Install OrangeHRM**
   ```bash
   docker run -d -p 8081:80 --name orangehrm orangehrm/orangehrm:latest
   ```

2. **Initial Configuration**
   - Open http://localhost:8081
   - Complete setup wizard
   - Login with admin credentials

3. **Register OAuth Client**
   - Admin → Configuration → Register OAuth Client
   - Create new client
   - Copy credentials
   - Add to .env.local

4. **Enable API Access**
   - Admin → Configuration → Modules
   - Enable REST API module

---

## Troubleshooting

### Odoo Connection Issues

**Error: "Authentication failed"**
- Check ODOO_USERNAME and ODOO_PASSWORD
- Verify database name matches ODOO_DB
- Ensure Odoo is running: `docker ps`

**Error: "Connection refused"**
- Check if Odoo is running on port 8069
- Verify ODOO_URL is correct
- Check firewall settings

### SuiteCRM Connection Issues

**Error: "Invalid client credentials"**
- Verify SUITECRM_CLIENT_ID and SUITECRM_CLIENT_SECRET
- Recreate OAuth client in SuiteCRM admin
- Check if API is enabled

**Error: "Access denied"**
- Check user permissions in SuiteCRM
- Verify API access is enabled
- Check OAuth client configuration

### OrangeHRM Connection Issues

**Error: "OAuth authentication failed"**
- Verify ORANGEHRM_CLIENT_ID and ORANGEHRM_CLIENT_SECRET
- Check if OAuth client is registered
- Ensure API module is enabled

**Error: "Employee not found"**
- Check employee number format
- Verify employee exists in OrangeHRM
- Check API permissions

---

## Best Practices

### Security

1. **Use environment variables** for all credentials
2. **Never commit** .env.local to version control
3. **Rotate credentials** regularly
4. **Use HTTPS** in production
5. **Implement rate limiting** for API calls

### Performance

1. **Cache API responses** when possible
2. **Use pagination** for large datasets
3. **Implement retry logic** for failed requests
4. **Monitor API usage** and quotas
5. **Use webhooks** instead of polling

### Data Consistency

1. **Validate data** before linking
2. **Handle errors gracefully**
3. **Log all integration actions**
4. **Implement rollback** for failed operations
5. **Regular sync checks**

---

## API Reference

### Link Request to External System

```
POST /api/requests/[id]/link
```

**Body:**
```json
{
  "type": "odoo_po|odoo_invoice|crm_contact|hrm_employee",
  "externalId": "123",
  "externalUrl": "http://..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully linked to external system"
}
```

### Get Request Links

```
GET /api/requests/[id]/link
```

**Response:**
```json
{
  "success": true,
  "links": [
    {
      "type": "odoo_po",
      "externalId": "123",
      "externalUrl": "http://...",
      "linkedAt": "2024-01-01T00:00:00Z",
      "linkedBy": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

## Examples

### Complete Integration Flow

```typescript
// 1. Create approval request
const request = await createRequest({
  title: 'Purchase Office Supplies',
  costEstimate: 5000,
  // ...
});

// 2. Link to Odoo purchase order
const purchaseOrder = await createPurchaseOrder({
  partnerId: vendorId,
  lines: [{ productId, quantity, price }]
});

await linkToRequest(request.id, 'odoo_po', purchaseOrder.id);

// 3. Link to CRM contact
const contact = await findContact({ email: vendor.email });
await linkToRequest(request.id, 'crm_contact', contact.id);

// 4. Link to employee (requester)
const employee = await findEmployee({ email: requester.email });
await linkToRequest(request.id, 'hrm_employee', employee.empNumber);

// 5. When approved, create invoice in Odoo
if (request.status === 'approved') {
  const invoice = await createInvoice({
    partnerId: vendorId,
    invoiceDate: new Date(),
    lines: purchaseOrder.lines
  });
  
  await linkToRequest(request.id, 'odoo_invoice', invoice.id);
}
```

---

## Cost

All integrations are **100% FREE**:
- Odoo: Open-source (self-hosted)
- SuiteCRM: Open-source (self-hosted)
- OrangeHRM: Open-source (self-hosted)

**Total Cost: $0/month**

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check system logs
4. Verify environment variables
5. Test connections individually

---

## Next Steps

1. Install all three systems
2. Configure environment variables
3. Test API connections
4. Add IntegrationLinks component to UI
5. Train users on linking workflow
6. Monitor integration logs
7. Set up automated syncs

