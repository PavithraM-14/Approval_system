# Project Checkpoints: S.E.A.D.

This file tracks the evolution of the **System for Enterprise Approval Digitalization (S.E.A.D.)**. It serves as a continuous log of changes, architectural decisions, and project state to ensure consistency and context awareness across all development tasks.

---

## 🏗️ Project Overview

**S.E.A.D.** is a digital approval workflow system for SRM-RMP Institutional Approval. It streamlines requests through a sophisticated role-based state machine.

### Core Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Styling**: Tailwind CSS
- **Auth**: Custom JWT-based Role-Based Access Control (RBAC)
- **Formatting**: Indian Number System (Lakhs/Crores)

### Key Workflows
1. **Request Creation**: Requesters submit with purpose, category, cost, and SOP reference.
2. **Parallel Verification**: SOP Verifier and Accountant check compliance and budget simultaneously.
3. **Manager Routing**: Institution Manager reviews verifications and routes the request.
4. **Hierarchical Approval**: VP → HOI → Dean → Chief Director → Chairman.
5. **Targeted Queries**: Dean can query specific departments (MMA, HR, Audit, IT).

---

## 🛠️ Architecture & Conventions

### Directory Structure
- `app/api/`: Serverless functions for backend logic.
- `app/dashboard/`: Role-specific UI views.
- `components/`: Modular UI elements (Modals, Lists, Inputs).
- `lib/`: Business logic (Approval Engine, Query Engine, Visibility).
- `models/`: Mongoose schemas (Request, User, Notification, etc.).

### Approval States (`lib/approval-engine.ts`)
- `MANAGER_REVIEW`, `PARALLEL_VERIFICATION`, `SOP_COMPLETED`, `BUDGET_COMPLETED`, `VP_APPROVAL`, `HOI_APPROVAL`, `DEAN_REVIEW`, `DEPARTMENT_CHECKS`, `CHIEF_DIRECTOR_APPROVAL`, `CHAIRMAN_APPROVAL`, `APPROVED`, `REJECTED`.

### Naming & Style
- **File Names**: Kebab-case for directories/API routes; PascalCase for React components.
- **State Management**: SWR for optimistic UI updates.
- **Validation**: Zod schemas for API request validation.

---

## 📜 Change Log

### [2026-03-01] - Bug Fix: System Admin Unrestricted Access
- **Task**: Fix access restrictions for System Admin across all dashboard pages.
- **Files Modified**: 
  - `lib/request-visibility.ts` (Added System Admin bypass)
  - `app/api/requests/route.ts`, `app/api/approvals/route.ts`, `app/api/dashboard/stats/route.ts`, `app/api/in-progress/route.ts` (Updated to handle System Admin)
  - `app/dashboard/page.tsx`, `app/dashboard/requests/page.tsx`, `app/dashboard/approvals/page.tsx`, `app/dashboard/queries/page.tsx`, `app/dashboard/in-progress/page.tsx`, `app/dashboard/layout.tsx` (Refactored UI for Admin access)
- **Details**:
  - Implemented logic to ensure System Admins are not treated only as "Requesters" when they possess all permission flags.
  - Removed requester-specific redirections for accounts where `isSystemAdmin` is true.
  - Updated visibility engine to grant administrators full read/write access to all requests.
  - Refined header and labels to display "SYSTEM ADMINISTRATOR" for admin accounts.

### [2026-03-01] - Bug Fix: MissingSchemaError
- **Files Modified**: 
  - `lib/auth.ts` (Fixed model registration and population logic)
- **Details**:
  - Renamed imported `Role` interface to `IRole` to avoid conflict with the Mongoose model.
  - Added explicit model reference in `.populate({ path: 'role', model: Role })` to prevent schema registration errors in Next.js development mode.

### [2026-03-01] - RBAC & E-Signature Refactoring
- **Task**: Refactor specialized academic system into generic Document Management & Approval System (DMAS).
- **Files Modified**: 
  - `models/Role.ts`, `models/User.ts`, `lib/types.ts`, `lib/auth.ts`, `app/api/roles/route.ts`, `app/signup/page.tsx`, `components/ApprovalModal.tsx`, `app/api/requests/[id]/approve/route.ts`, `app/dashboard/layout.tsx`
- **Details**:
  - Implemented dynamic RBAC with 7 permission flags.
  - Transformed approval process into an E-Signature process.
  - Replaced hardcoded role checks with dynamic permission-based logic.
  - Added Role Management dashboard for administrators.

---

*Note: This file is updated automatically by Gemini CLI after every modification.*
