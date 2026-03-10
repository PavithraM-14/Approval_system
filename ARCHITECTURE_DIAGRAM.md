# S.E.A.D. Approval System - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Browser    │  │   Mobile     │  │  External    │  │   Public    │ │
│  │   (Users)    │  │   Devices    │  │   Users      │  │   Share     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │         │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                         Next.js 14 (React 18)                            │
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  Dashboard Pages   │  │   Auth Pages       │  │   Share Pages     │ │
│  │  ─────────────     │  │   ──────────       │  │   ───────────     │ │
│  │  • Home            │  │   • Login          │  │   • View Doc      │ │
│  │  • Requests        │  │   • Signup         │  │   • Download      │ │
│  │  • Approvals       │  │   • OTP Verify     │  │   • Password      │ │
│  │  • Documents       │  │   • Reset Password │  │                   │ │
│  │  • In Progress     │  │                    │  │                   │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    React Components                                  ││
│  │  • Sidebar • Header • Tables • Forms • Modals • Charts              ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  Authentication    │  │   Authorization    │  │   Request         │ │
│  │  ──────────────    │  │   ──────────────   │  │   Validation      │ │
│  │  • JWT Verify      │  │   • Role Check     │  │   ──────────      │ │
│  │  • Cookie Parse    │  │   • Dept Check     │  │   • Zod Schema    │ │
│  │  • Session Mgmt    │  │   • Permission     │  │   • Input Clean   │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API LAYER (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Authentication APIs                          │  │
│  │  /api/auth/login  /api/auth/signup  /api/auth/verify-otp        │  │
│  │  /api/auth/send-otp  /api/auth/forgot-password                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Request Management APIs                      │  │
│  │  GET/POST /api/requests  GET/PUT /api/requests/[id]             │  │
│  │  POST /api/requests/[id]/approve  GET /api/requests/search      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Document Management APIs                     │  │
│  │  GET/POST /api/documents  GET/PUT/DELETE /api/documents/[id]    │  │
│  │  GET /api/documents/search  GET /api/view  GET /api/download    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Share Link APIs                              │  │
│  │  POST /api/share/create  GET /api/share/[token]                 │  │
│  │  GET /api/share/[token]/info                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Other APIs                                   │  │
│  │  GET /api/dashboard/stats  GET /api/approvals                    │  │
│  │  GET /api/notifications  POST /api/upload                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  Request Service   │  │  Document Service  │  │  Share Service    │ │
│  │  ───────────────   │  │  ────────────────  │  │  ─────────────    │ │
│  │  • Create          │  │  • Upload          │  │  • Generate Token │ │
│  │  • Update          │  │  • Retrieve        │  │  • Apply Watermark│ │
│  │  • Approve/Reject  │  │  • Search          │  │  • Track Access   │ │
│  │  • Status Track    │  │  • Delete          │  │  • Validate Expiry│ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  Auth Service      │  │  Email Service     │  │  Notification Svc │ │
│  │  ─────────────     │  │  ─────────────     │  │  ────────────────  │ │
│  │  • Login           │  │  • Send OTP        │  │  • Real-time      │ │
│  │  • Register        │  │  • Approval Notice │  │  • Email Alerts   │ │
│  │  • JWT Generate    │  │  • Reminders       │  │  • Status Updates │ │
│  │  • Password Reset  │  │  • Welcome Email   │  │                   │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                         Mongoose ODM                                     │
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  User Model        │  │  Request Model     │  │  File Model       │ │
│  │  ──────────        │  │  ─────────────     │  │  ──────────       │ │
│  │  • Schema          │  │  • Schema          │  │  • GridFS         │ │
│  │  • Validation      │  │  • Validation      │  │  • Binary Data    │ │
│  │  • Hooks           │  │  • Hooks           │  │  • Metadata       │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  ShareLink Model   │  │  AuditLog Model    │  │  Budget Model     │ │
│  │  ───────────────   │  │  ──────────────    │  │  ────────────     │ │
│  │  • Token           │  │  • Activity Track  │  │  • Financial Data │ │
│  │  • Expiry          │  │  • User Actions    │  │  • Allocations    │ │
│  │  • Access Log      │  │  • Timestamps      │  │                   │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                         MongoDB Atlas                                    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Collections                                │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │
│  │  │   users     │  │  requests   │  │   files     │             │  │
│  │  │  (Auth)     │  │  (Approval) │  │  (GridFS)   │             │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │
│  │  │ sharelinks  │  │  auditlogs  │  │   budgets   │             │  │
│  │  │  (Sharing)  │  │  (Tracking) │  │ (Financial) │             │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │  Gmail SMTP        │  │  MongoDB Atlas     │  │  File System      │ │
│  │  ──────────        │  │  ─────────────     │  │  ───────────      │ │
│  │  • OTP Emails      │  │  • Cloud Database  │  │  • Temp Storage   │ │
│  │  • Notifications   │  │  • Auto Backup     │  │  • Logs           │ │
│  │  • Reminders       │  │  • Scaling         │  │                   │ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

```

---

## Detailed Component Architecture

### 1. Authentication Flow
```
User Input (Login)
      │
      ▼
┌─────────────────┐
│ Login Page      │
│ /login          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/auth/ │
│ login           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Password │
│ (bcryptjs)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate JWT    │
│ (Jose)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set HTTP-only   │
│ Cookie          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ Dashboard       │
└─────────────────┘
```

### 2. Request Approval Flow
```
User Creates Request
      │
      ▼
┌──────────────────────┐
│ Request Form         │
│ /dashboard/requests/ │
│ create               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Upload Documents     │
│ POST /api/upload     │
│ (MongoDB GridFS)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/requests   │
│ Create Request       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Save to MongoDB      │
│ (Request Model)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Send Email           │
│ Notification         │
│ (Nodemailer)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Approver Reviews     │
│ /dashboard/approvals │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/requests/  │
│ [id]/approve         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Update Status        │
│ Send Notification    │
└──────────────────────┘
```

### 3. Document Sharing Flow
```
User Selects Document
      │
      ▼
┌──────────────────────┐
│ Click Share Button   │
│ /dashboard/documents │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Share Modal Opens    │
│ Set Expiry/Password  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/share/     │
│ create               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Generate Token       │
│ (crypto.randomBytes) │
│ 64 characters        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Save ShareLink       │
│ to MongoDB           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Return Share URL     │
│ /share/[token]       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ External User        │
│ Accesses Link        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ GET /api/share/      │
│ [token]              │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Validate Token       │
│ Check Expiry         │
│ Verify Password      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Fetch File from      │
│ MongoDB GridFS       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Apply Watermark      │
│ (pdf-lib)            │
│ "S.E.A.D." + Date    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Log Access           │
│ (IP, timestamp)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Return PDF           │
│ (View/Download)      │
└──────────────────────┘
```

### 4. File Upload & Storage Flow
```
User Uploads File
      │
      ▼
┌──────────────────────┐
│ File Input           │
│ (React Component)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ POST /api/upload     │
│ FormData             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Validate File        │
│ • Type Check         │
│ • Size Limit         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Save to MongoDB      │
│ GridFS               │
│ (Binary Storage)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Return File ID       │
│ (MongoDB ObjectId)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Link to Request      │
│ (attachments array)  │
└──────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│         Next.js Application             │
│  ┌───────────────────────────────────┐  │
│  │     React Components (UI)         │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │     API Routes (Backend)          │  │
│  │  • Authentication                 │  │
│  │  • Business Logic                 │  │
│  │  • Data Validation                │  │
│  └───────────┬───────────────────────┘  │
└──────────────┼───────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│  MongoDB    │  │   Gmail     │
│  Database   │  │   SMTP      │
│             │  │             │
│  • Users    │  │  • OTP      │
│  • Requests │  │  • Alerts   │
│  • Files    │  │  • Reminders│
│  • Links    │  │             │
└─────────────┘  └─────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 1: Transport Security                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • HTTPS/TLS Encryption                                    │ │
│  │  • Secure Headers                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Layer 2: Authentication                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • JWT Tokens (Jose)                                       │ │
│  │  • HTTP-only Cookies                                       │ │
│  │  • Password Hashing (bcrypt)                               │ │
│  │  • OTP Verification                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Layer 3: Authorization                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Role-Based Access Control (RBAC)                        │ │
│  │  • Department-Based Permissions                            │ │
│  │  • Request-Level Permissions                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Layer 4: Input Validation                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Zod Schema Validation                                   │ │
│  │  • File Type Validation                                    │ │
│  │  • Size Limits                                             │ │
│  │  • XSS Prevention (React)                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Layer 5: Data Protection                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • MongoDB Injection Prevention (Mongoose)                 │ │
│  │  • Encrypted Connections                                   │ │
│  │  • Audit Logging                                           │ │
│  │  • Document Watermarking                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                           │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   Internet   │
                              └──────┬───────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   Load Balancer       │
                         │   (Optional)          │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
          │  Next.js    │  │  Next.js    │  │  Next.js    │
          │  Instance 1 │  │  Instance 2 │  │  Instance N │
          └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐        ┌──────────────────┐
          │  MongoDB Atlas   │        │   Gmail SMTP     │
          │  (Primary)       │        │   Server         │
          │                  │        │                  │
          │  ┌────────────┐  │        └──────────────────┘
          │  │  Replica   │  │
          │  │  Set       │  │
          │  └────────────┘  │
          └──────────────────┘
```

### Deployment Options

**Option 1: Vercel (Recommended)**
```
┌─────────────────────────────────────┐
│         Vercel Platform             │
│  • Automatic deployments            │
│  • Edge network (CDN)               │
│  • Serverless functions             │
│  • Environment variables            │
│  • SSL certificates                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      MongoDB Atlas (External)       │
└─────────────────────────────────────┘
```

**Option 2: Render.com**
```
┌─────────────────────────────────────┐
│         Render Platform             │
│  • Web service                      │
│  • Auto-deploy from Git             │
│  • Environment variables            │
│  • SSL certificates                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      MongoDB Atlas (External)       │
└─────────────────────────────────────┘
```

**Option 3: Self-Hosted**
```
┌─────────────────────────────────────┐
│         Your Server                 │
│  • Node.js runtime                  │
│  • PM2 process manager              │
│  • Nginx reverse proxy              │
│  • SSL certificates (Let's Encrypt) │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      MongoDB (Self-hosted/Atlas)    │
└─────────────────────────────────────┘
```

---

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  Next.js 14 • React 18 • Tailwind CSS • Headless UI             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  TypeScript • React Hook Form • SWR • Zod                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                          │
│  Custom Services • Validation • Authorization                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                             │
│  Mongoose ODM • Models • Schemas                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  MongoDB Atlas • GridFS                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  Gmail SMTP • pdf-lib • Puppeteer                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Dependencies

```
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend Modules                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  app/                                                             │
│  ├── dashboard/          (Protected Routes)                       │
│  │   ├── page.tsx       → Dashboard Home                         │
│  │   ├── requests/      → Request Management                     │
│  │   ├── approvals/     → Approval Queue                         │
│  │   ├── documents/     → Document Library                       │
│  │   └── in-progress/   → In-Progress Requests                   │
│  │                                                                 │
│  ├── login/             (Public Routes)                           │
│  ├── signup/                                                      │
│  └── share/[token]/     (Public Share Links)                      │
│                                                                    │
│  components/                                                      │
│  ├── Sidebar.tsx        → Navigation                              │
│  ├── Header.tsx         → Top Bar                                 │
│  ├── RequestForm.tsx    → Create/Edit Requests                    │
│  ├── ApprovalCard.tsx   → Approval UI                             │
│  ├── DocumentCard.tsx   → Document Display                        │
│  └── ShareModal.tsx     → Share Link Generator                    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      Backend Modules                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  app/api/                                                         │
│  ├── auth/              (Authentication)                          │
│  │   ├── login/         → User Login                             │
│  │   ├── signup/        → User Registration                       │
│  │   ├── send-otp/      → OTP Generation                         │
│  │   ├── verify-otp/    → OTP Verification                       │
│  │   └── reset-password/ → Password Reset                        │
│  │                                                                 │
│  ├── requests/          (Request Management)                      │
│  │   ├── route.ts       → List/Create Requests                   │
│  │   ├── [id]/route.ts  → Get/Update/Delete Request              │
│  │   └── [id]/approve/  → Approve/Reject Request                 │
│  │                                                                 │
│  ├── documents/         (Document Management)                     │
│  │   ├── route.ts       → List Documents                         │
│  │   ├── [id]/route.ts  → Get/Delete Document                    │
│  │   └── search/        → Search Documents                       │
│  │                                                                 │
│  ├── share/             (External Sharing)                        │
│  │   ├── create/        → Generate Share Link                    │
│  │   ├── [token]/       → Access Shared Document                 │
│  │   └── [token]/info/  → Get Share Link Info                    │
│  │                                                                 │
│  ├── upload/            → File Upload Handler                     │
│  ├── view/              → View Document                           │
│  ├── download/          → Download Document                       │
│  └── dashboard/stats/   → Dashboard Statistics                    │
│                                                                    │
│  lib/                   (Utilities)                               │
│  ├── mongodb.ts         → Database Connection                     │
│  ├── auth.ts            → JWT Utilities                           │
│  ├── email.ts           → Email Service                           │
│  └── notification-service.ts → Notification Handler               │
│                                                                    │
│  models/                (Data Models)                             │
│  ├── User.ts            → User Schema                             │
│  ├── Request.ts         → Request Schema                          │
│  ├── File.ts            → File Schema                             │
│  ├── ShareLink.ts       → ShareLink Schema                        │
│  ├── AuditLog.ts        → AuditLog Schema                         │
│  └── Budget.ts          → Budget Schema                           │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle State Machine

```
                    ┌──────────────┐
                    │   PENDING    │ ◄─── Initial State
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
              ▼                         ▼
     ┌────────────────┐        ┌────────────────┐
     │  IN_PROGRESS   │        │    APPROVED    │
     └────────┬───────┘        └────────┬───────┘
              │                         │
              │                         │
              ▼                         ▼
     ┌────────────────┐        ┌────────────────┐
     │   COMPLETED    │        │   REJECTED     │
     └────────────────┘        └────────────────┘

States:
• PENDING      - Awaiting approval
• IN_PROGRESS  - Being processed
• APPROVED     - Approved by authority
• REJECTED     - Rejected by authority
• COMPLETED    - Fully processed
```

---

## User Role Hierarchy

```
                    ┌─────────────────┐
                    │      ADMIN      │
                    │  (Full Access)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │    APPROVER     │          │    DEPARTMENT   │
     │  (Can Approve)  │          │      HEAD       │
     └────────┬────────┘          └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      USER       │
                    │  (Create/View)  │
                    └─────────────────┘

Permissions:
• ADMIN      - All operations
• APPROVER   - Approve/reject requests
• DEPT_HEAD  - Department-level approvals
• USER       - Create requests, view own requests
```

---

## API Endpoint Map

```
Authentication Endpoints
├── POST   /api/auth/login
├── POST   /api/auth/signup
├── POST   /api/auth/send-otp
├── POST   /api/auth/verify-otp
├── POST   /api/auth/resend-otp
├── POST   /api/auth/forgot-password
├── POST   /api/auth/reset-password
├── POST   /api/auth/logout
└── GET    /api/auth/me

Request Management Endpoints
├── GET    /api/requests              (List all)
├── POST   /api/requests              (Create new)
├── GET    /api/requests/[id]         (Get one)
├── PUT    /api/requests/[id]         (Update)
├── DELETE /api/requests/[id]         (Delete)
├── POST   /api/requests/[id]/approve (Approve/Reject)
└── GET    /api/requests/search       (Search)

Document Management Endpoints
├── GET    /api/documents             (List all)
├── POST   /api/documents             (Create)
├── GET    /api/documents/[id]        (Get one)
├── PUT    /api/documents/[id]        (Update)
├── DELETE /api/documents/[id]        (Delete)
└── GET    /api/documents/search      (Search)

File Endpoints
├── POST   /api/upload                (Upload file)
├── GET    /api/view                  (View file)
├── GET    /api/download              (Download file)
└── GET    /api/files/[id]            (Get file metadata)

Share Link Endpoints
├── POST   /api/share/create          (Generate share link)
├── GET    /api/share/[token]         (Access shared document)
└── GET    /api/share/[token]/info    (Get share link info)

Dashboard Endpoints
├── GET    /api/dashboard/stats       (Statistics)
├── GET    /api/approvals             (Pending approvals)
├── GET    /api/in-progress           (In-progress requests)
└── GET    /api/notifications         (User notifications)

Utility Endpoints
├── GET    /api/health                (Health check)
└── GET    /api/folders               (Folder structure)
```

---

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MongoDB Collections                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       users          │
├──────────────────────┤
│ _id: ObjectId        │
│ name: String         │
│ email: String (uniq) │
│ password: String     │
│ role: String         │
│ department: String   │
│ isVerified: Boolean  │
│ otp: String          │
│ otpExpiry: Date      │
│ createdAt: Date      │
└──────────┬───────────┘
           │
           │ 1:N
           │
           ▼
┌──────────────────────┐
│      requests        │
├──────────────────────┤
│ _id: ObjectId        │
│ requestId: String    │
│ title: String        │
│ description: String  │
│ category: String     │
│ priority: String     │
│ status: String       │
│ requestedBy: ObjectId│──┐
│ approvedBy: ObjectId │  │
│ department: String   │  │
│ attachments: [       │  │
│   {                  │  │
│     fileId: ObjectId │──┼──┐
│     filename: String │  │  │
│   }                  │  │  │
│ ]                    │  │  │
│ createdAt: Date      │  │  │
│ updatedAt: Date      │  │  │
└──────────────────────┘  │  │
                          │  │
           ┌──────────────┘  │
           │                 │
           ▼                 │
┌──────────────────────┐    │
│       files          │◄───┘
├──────────────────────┤
│ _id: ObjectId        │
│ filename: String     │
│ originalName: String │
│ mimeType: String     │
│ size: Number         │
│ data: Buffer         │
│ uploadedBy: ObjectId │
│ uploadedAt: Date     │
└──────────┬───────────┘
           │
           │ 1:N
           │
           ▼
┌──────────────────────┐
│     sharelinks       │
├──────────────────────┤
│ _id: ObjectId        │
│ token: String (uniq) │
│ fileId: ObjectId     │──┐
│ createdBy: ObjectId  │  │
│ expiresAt: Date      │  │
│ password: String     │  │
│ allowDownload: Bool  │  │
│ isActive: Boolean    │  │
│ accessCount: Number  │  │
│ accessLog: [         │  │
│   {                  │  │
│     ip: String       │  │
│     userAgent: String│  │
│     accessedAt: Date │  │
│   }                  │  │
│ ]                    │  │
│ createdAt: Date      │  │
└──────────────────────┘  │
                          │
           ┌──────────────┘
           │
           ▼
      (References files collection)

┌──────────────────────┐
│     auditlogs        │
├──────────────────────┤
│ _id: ObjectId        │
│ userId: ObjectId     │
│ action: String       │
│ resource: String     │
│ resourceId: ObjectId │
│ details: Object      │
│ ipAddress: String    │
│ userAgent: String    │
│ timestamp: Date      │
└──────────────────────┘

┌──────────────────────┐
│      budgets         │
├──────────────────────┤
│ _id: ObjectId        │
│ department: String   │
│ fiscalYear: String   │
│ allocated: Number    │
│ spent: Number        │
│ remaining: Number    │
│ updatedAt: Date      │
└──────────────────────┘
```

---

## Key Design Patterns

### 1. Repository Pattern
```
Controller (API Route)
      │
      ▼
Service Layer (Business Logic)
      │
      ▼
Repository (Mongoose Models)
      │
      ▼
Database (MongoDB)
```

### 2. Middleware Chain
```
Request
  │
  ▼
┌─────────────────┐
│ CORS Handler    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Auth Middleware │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Role Check      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ API Handler     │
└────────┬────────┘
         ▼
Response
```

### 3. Component Composition
```
Page Component
  │
  ├── Layout Component
  │     ├── Sidebar
  │     ├── Header
  │     └── Footer
  │
  └── Feature Components
        ├── Data Fetching (SWR)
        ├── Form Handling (React Hook Form)
        ├── Validation (Zod)
        └── UI Components (Headless UI)
```

---

## Performance & Scalability

### Caching Strategy
```
┌─────────────────────────────────────────┐
│         Browser Cache                   │
│  • Static Assets (CSS, JS, Images)      │
│  • Service Worker (Optional)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         SWR Cache                       │
│  • API Response Caching                 │
│  • Automatic Revalidation               │
│  • Optimistic Updates                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Database Indexes                │
│  • User email (unique)                  │
│  • Request status                       │
│  • ShareLink token (unique)             │
│  • Timestamps                           │
└─────────────────────────────────────────┘
```

### Horizontal Scaling
```
Load Balancer
      │
      ├─── Next.js Instance 1
      ├─── Next.js Instance 2
      └─── Next.js Instance N
              │
              ▼
      MongoDB Replica Set
      (Automatic Sharding)
```

---

## Summary

This architecture provides:

✅ **Scalability** - Serverless functions, horizontal scaling
✅ **Security** - Multi-layer authentication & authorization
✅ **Performance** - Caching, indexing, optimized queries
✅ **Maintainability** - Clear separation of concerns
✅ **Flexibility** - Modular design, easy to extend
✅ **Reliability** - Error handling, audit logging
✅ **Modern Stack** - Latest technologies and best practices
