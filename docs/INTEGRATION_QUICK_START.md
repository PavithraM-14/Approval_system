# Integration Quick Start Guide

Get Odoo, SuiteCRM, and OrangeHRM running in 10 minutes.

---

## 1. Start Systems (2 minutes)

```powershell
.\setup-integrations.ps1
```

This starts:
- Odoo at http://localhost:8069
- SuiteCRM at http://localhost:8080
- OrangeHRM at http://localhost:8081

---

## 2. Configure Odoo (3 minutes)

1. Open http://localhost:8069
2. Click "Create Database"
3. Database name: `sead_erp`
4. Email: `admin@example.com`
5. Password: `admin`
6. Click "Create Database"
7. Install modules: Purchase, Invoicing

**Done!** Odoo is ready.

---

## 3. Configure SuiteCRM (3 minutes)

1. Open http://localhost:8080
2. Complete setup wizard
3. Login as admin
4. Go to Admin → OAuth2 Clients
5. Click "Create OAuth2 Client"
6. Name: `SEAD System`
7. Copy Client ID and Secret
8. Add to `.env.local`:
   ```env
   SUITECRM_CLIENT_ID=your-client-id
   SUITECRM_CLIENT_SECRET=your-client-secret
   ```

**Done!** SuiteCRM is ready.

---

## 4. Configure OrangeHRM (2 minutes)

1. Open http://localhost:8081
2. Complete setup wizard
3. Login as admin
4. Go to Admin → Configuration → Register OAuth Client
5. Name: `SEAD System`
6. Copy Client ID and Secret
7. Add to `.env.local`:
   ```env
   ORANGEHRM_CLIENT_ID=your-client-id
   ORANGEHRM_CLIENT_SECRET=your-client-secret
   ```

**Done!** OrangeHRM is ready.

---

## 5. Test (1 minute)

```bash
npx ts-node scripts/test-integrations.ts
```

Should see:
```
✅ Odoo integration working!
✅ SuiteCRM integration working!
✅ OrangeHRM integration working!
🎉 All integrations working!
```

---

## Complete .env.local

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
SUITECRM_CLIENT_ID=paste-from-step-3
SUITECRM_CLIENT_SECRET=paste-from-step-3

# OrangeHRM
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=paste-from-step-4
ORANGEHRM_CLIENT_SECRET=paste-from-step-4
ORANGEHRM_USERNAME=admin
ORANGEHRM_PASSWORD=admin
```

---

## Usage

### Link Request to Purchase Order

1. Open request detail page
2. Click "Link to ERP/CRM/HR"
3. Select "Odoo ERP" tab
4. Choose purchase order
5. Click to link

### Link Request to Contact

1. Open request detail page
2. Click "Link to ERP/CRM/HR"
3. Select "SuiteCRM" tab
4. Choose contact
5. Click to link

### Link Request to Employee

1. Open request detail page
2. Click "Link to ERP/CRM/HR"
3. Select "OrangeHRM" tab
4. Choose employee
5. Click to link

---

## Troubleshooting

### "Docker not found"
Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "Port already in use"
Stop conflicting services:
```powershell
# Check what's using the port
netstat -ano | findstr :8069
netstat -ano | findstr :8080
netstat -ano | findstr :8081

# Kill the process
taskkill /PID <process-id> /F
```

### "Authentication failed"
- Check credentials in .env.local
- Verify systems are running: `docker ps`
- Restart containers: `docker restart odoo suitecrm orangehrm`

### "Connection refused"
- Check if Docker is running
- Verify ports are accessible
- Check firewall settings

---

## Stop Systems

```powershell
docker stop odoo suitecrm orangehrm
```

## Start Systems Again

```powershell
docker start odoo suitecrm orangehrm
```

## Remove Systems

```powershell
docker rm -f odoo suitecrm orangehrm
```

---

## Support

- Full guide: `docs/ERP_CRM_HR_INTEGRATION.md`
- Setup guide: `docs/INTEGRATIONS_SETUP_GUIDE.md`
- Implementation: `docs/INTEGRATION_IMPLEMENTATION_SUMMARY.md`

