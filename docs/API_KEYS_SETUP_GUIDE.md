# API Keys Setup Guide

This guide will walk you through setting up API keys for all integrations in the S.E.A.D. system.

## 🔴 REQUIRED: Gmail & Google Drive (FREE)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Select a project" → "New Project"
4. Enter project name: `SEAD-Document-System`
5. Click "Create"

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search and enable these APIs (click each, then click "Enable"):
   - **Gmail API**
   - **Google Drive API**
   - **Google Docs API**
   - **Google Sheets API**

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (for testing with any Google account)
3. Click "Create"
4. Fill in required fields:
   - **App name**: `S.E.A.D. Document System`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/documents
   https://www.googleapis.com/auth/spreadsheets
   ```
8. Click "Update" → "Save and Continue"
9. On "Test users" page, click "Add Users"
10. Add your email address (you'll use this to test)
11. Click "Save and Continue"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Enter name: `SEAD-Web-Client`
5. Under "Authorized redirect URIs", click "Add URI" and add:
   ```
   http://localhost:3000/api/gmail/callback
   ```
6. Click "Create"
7. **IMPORTANT**: Copy the Client ID and Client Secret that appear
   - Keep this window open or save them somewhere safe

### Step 5: Update .env.local File

Add these lines to your `.env.local` file (replace with your actual values):

```env
# Gmail & Google Drive Integration (REQUIRED)
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Google Drive uses the same OAuth credentials
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

**Note**: Gmail and Google Drive can share the same OAuth credentials since they're from the same Google Cloud project.

### Step 6: Install Dependencies

Run this command to install the Google APIs client:

```bash
npm install googleapis
```

### Step 7: Test Gmail Connection

1. Start your development server: `npm run dev`
2. Open browser and go to: `http://localhost:3000/api/gmail/auth`
3. You'll be redirected to Google sign-in
4. Sign in with the test user email you added earlier
5. Grant permissions to the app
6. You should be redirected back with a success message

✅ **Gmail & Google Drive setup complete!**

---

## 🟡 OPTIONAL: Odoo ERP (Self-Hosted)

Odoo is an open-source ERP system. You can run it locally using Docker.

### Option 1: Docker Setup (Recommended)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. Create a `docker-compose.yml` file in your project root:

```yaml
version: '3.1'
services:
  odoo:
    image: odoo:16.0
    depends_on:
      - db
    ports:
      - "8069:8069"
    environment:
      - HOST=db
      - USER=odoo
      - PASSWORD=odoo
    volumes:
      - odoo-data:/var/lib/odoo

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_PASSWORD=odoo
      - POSTGRES_USER=odoo
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  odoo-data:
  db-data:
```

3. Run: `docker-compose up -d`

4. Access Odoo at: `http://localhost:8069`

5. Create a database:
   - Database name: `odoo`
   - Email: Your email
   - Password: `admin`

6. Add to `.env.local`:

```env
# Odoo ERP (Optional)
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
```

### Option 2: Skip Odoo

If you don't need ERP integration, you can skip this. The system will work without it.

---

## 🟡 OPTIONAL: SuiteCRM (Self-Hosted)

SuiteCRM is an open-source CRM system.

### Docker Setup

1. Add to your `docker-compose.yml`:

```yaml
  suitecrm:
    image: bitnami/suitecrm:latest
    ports:
      - "8080:8080"
      - "8443:8443"
    environment:
      - SUITECRM_DATABASE_HOST=suitecrm-db
      - SUITECRM_DATABASE_NAME=suitecrm
      - SUITECRM_DATABASE_USER=suitecrm
      - SUITECRM_DATABASE_PASSWORD=suitecrm
      - SUITECRM_USERNAME=admin
      - SUITECRM_PASSWORD=admin123
    volumes:
      - suitecrm-data:/bitnami/suitecrm
    depends_on:
      - suitecrm-db

  suitecrm-db:
    image: mariadb:10.6
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=suitecrm
      - MYSQL_USER=suitecrm
      - MYSQL_PASSWORD=suitecrm
    volumes:
      - suitecrm-db-data:/var/lib/mysql

volumes:
  suitecrm-data:
  suitecrm-db-data:
```

2. Run: `docker-compose up -d`

3. Access SuiteCRM at: `http://localhost:8080`

4. Login with:
   - Username: `admin`
   - Password: `admin123`

5. Generate API credentials in SuiteCRM admin panel

6. Add to `.env.local`:

```env
# SuiteCRM (Optional)
SUITECRM_URL=http://localhost:8080
SUITECRM_CLIENT_ID=your-client-id
SUITECRM_CLIENT_SECRET=your-client-secret
```

### Option 2: Skip SuiteCRM

If you don't need CRM integration, you can skip this.

---

## 🟡 OPTIONAL: OrangeHRM (Self-Hosted)

OrangeHRM is an open-source HR management system.

### Docker Setup

1. Add to your `docker-compose.yml`:

```yaml
  orangehrm:
    image: orangehrm/orangehrm:latest
    ports:
      - "8081:80"
    environment:
      - ORANGEHRM_DATABASE_HOST=orangehrm-db
      - ORANGEHRM_DATABASE_NAME=orangehrm
      - ORANGEHRM_DATABASE_USER=orangehrm
      - ORANGEHRM_DATABASE_PASSWORD=orangehrm
    volumes:
      - orangehrm-data:/var/www/html
    depends_on:
      - orangehrm-db

  orangehrm-db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=orangehrm
      - MYSQL_USER=orangehrm
      - MYSQL_PASSWORD=orangehrm
    volumes:
      - orangehrm-db-data:/var/lib/mysql

volumes:
  orangehrm-data:
  orangehrm-db-data:
```

2. Run: `docker-compose up -d`

3. Access OrangeHRM at: `http://localhost:8081`

4. Complete the installation wizard

5. Generate API credentials in OrangeHRM admin panel

6. Add to `.env.local`:

```env
# OrangeHRM (Optional)
ORANGEHRM_URL=http://localhost:8081
ORANGEHRM_CLIENT_ID=your-client-id
ORANGEHRM_CLIENT_SECRET=your-client-secret
```

### Option 2: Skip OrangeHRM

If you don't need HR integration, you can skip this.

---

## 📋 Summary

### What You MUST Do:
1. ✅ Set up Google Cloud Project (Gmail & Google Drive)
2. ✅ Add credentials to `.env.local`
3. ✅ Run `npm install googleapis`
4. ✅ Test Gmail connection

### What's Optional:
- Odoo ERP (only if you need purchase orders, invoices)
- SuiteCRM (only if you need customer relationship management)
- OrangeHRM (only if you need HR document management)

### Your .env.local Should Look Like This:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://pavi_28:srmeec12@cluster0.7ntfbrr.mongodb.net/?appName=Cluster0

# App Configuration
NEXT_PUBLIC_APP_NAME=S.E.A.D.
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Upload directory
UPLOAD_DIR=./public/uploads

# Email Configuration
EMAIL_USER=srmapprovaldev123@gmail.com
EMAIL_PASSWORD=wncb mxsx muhb ezii

# Gmail & Google Drive Integration (REQUIRED - Add your values)
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

GOOGLE_DRIVE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Odoo ERP (Optional - Only if using Docker)
# ODOO_URL=http://localhost:8069
# ODOO_DB=odoo
# ODOO_USERNAME=admin
# ODOO_PASSWORD=admin

# SuiteCRM (Optional - Only if using Docker)
# SUITECRM_URL=http://localhost:8080
# SUITECRM_CLIENT_ID=xxxxx
# SUITECRM_CLIENT_SECRET=xxxxx

# OrangeHRM (Optional - Only if using Docker)
# ORANGEHRM_URL=http://localhost:8081
# ORANGEHRM_CLIENT_ID=xxxxx
# ORANGEHRM_CLIENT_SECRET=xxxxx
```

---

## 🚀 Next Steps

1. Complete the Google Cloud setup (Steps 1-7 above)
2. Run `npm install googleapis`
3. Test Gmail connection
4. Decide if you want optional integrations (Odoo/SuiteCRM/OrangeHRM)
5. Let me know when ready to commit and push!

## ❓ Need Help?

If you get stuck on any step, let me know which step and I'll help you troubleshoot!
