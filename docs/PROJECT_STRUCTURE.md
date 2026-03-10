# Project Structure

This document explains the organization of the codebase.

## Directory Structure

### `/app` - Next.js App Directory
Contains all pages and API routes using Next.js 14 App Router.

#### `/app/api` - API Routes
- `/auth` - Authentication endpoints (login, signup, logout, OTP)
- `/requests` - Request management CRUD operations
- `/approvals` - Approval workflow endpoints
- `/documents` - Document management
- `/workflows` - Workflow configuration
- `/roles` - Role management
- `/notifications` - Notification system
- `/gmail` - Gmail integration
- `/odoo` - Odoo ERP integration
- `/orangehrm` - OrangeHRM integration
- `/compliance` - Data compliance (GDPR)
- `/analytics` - Analytics and reporting
- `/backup` - Database backup
- `/cron` - Scheduled tasks

#### `/app/dashboard` - Dashboard Pages
- `/requests` - Request listing and details
- `/approvals` - Approval queue
- `/documents` - Document library
- `/workflow-builder` - Visual workflow designer
- `/roles` - Role management UI
- `/queries` - Query management
- `/in-progress` - In-progress requests
- `/analytics` - Analytics dashboard

### `/components` - React Components
Reusable UI components organized by feature:

- `ApprovalModal.tsx` - Approval action modal
- `ApprovalWorkflow.tsx` - Workflow visualization
- `DocumentViewer.tsx` - Document preview
- `FileUpload.tsx` - File upload component
- `WorkflowBuilder.tsx` - Workflow designer
- `NodePropertyEditor.tsx` - Workflow node editor
- `RequestSearch.tsx` - Advanced search
- `NotificationBell.tsx` - Notification dropdown
- `/workflow-nodes` - Custom workflow node types

### `/lib` - Business Logic & Utilities
Core business logic and utility functions:

#### Services
- `approval-engine.ts` - Approval workflow logic
- `workflow-execution-engine.ts` - Workflow execution
- `workflow-validator.ts` - Workflow validation
- `role-service.ts` - Role management
- `notification-service.ts` - Notifications
- `email.ts` - Email sending
- `audit-service.ts` - Audit logging
- `backup-service.ts` - Database backup
- `retention-service.ts` - Data retention
- `escalation-service.ts` - Escalation handling
- `renewal-service.ts` - Renewal processing

#### Integrations
- `gmail-service.ts` - Gmail API integration
- `google-drive-service.ts` - Google Drive integration
- `google-workspace-service.ts` - Google Workspace
- `odoo-service.ts` - Odoo ERP integration
- `orangehrm-service.ts` - OrangeHRM integration
- `suitecrm-service.ts` - SuiteCRM integration

#### Utilities
- `auth.ts` - Authentication helpers
- `mongodb.ts` - Database connection
- `types.ts` - TypeScript type definitions
- `constants.ts` - Application constants
- `utils.ts` - General utilities
- `watermark.ts` - Document watermarking
- `file-validation.ts` - File validation
- `id-generator.ts` - ID generation
- `query-engine.ts` - Query processing
- `request-visibility.ts` - Access control

### `/models` - Database Models
Mongoose schemas for MongoDB:

- `User.ts` - User accounts
- `Company.ts` - Company/organization
- `Role.ts` - Unified role model
- `Request.ts` - Document requests
- `Document.ts` - Document metadata
- `File.ts` - File metadata
- `Folder.ts` - Folder structure
- `WorkflowConfiguration.ts` - Workflow definitions
- `ExecutionState.ts` - Workflow execution state
- `Notification.ts` - Notifications
- `AuditLog.ts` - Audit trail
- `ShareLink.ts` - External sharing
- `RetentionPolicy.ts` - Retention policies
- `UserRoleAssignment.ts` - User-role mapping

### `/scripts` - Maintenance Scripts
Database and maintenance scripts:

- `seed.ts` - Seed sample data
- `seed-admin.ts` - Create admin user
- `clear-database.ts` - Clear all data
- `createBackup.ts` - Database backup
- `applyRetention.ts` - Apply retention policies
- `sendReminders.ts` - Send reminder emails
- `processRenewals.ts` - Process renewals
- `fix-user-company.ts` - Data migration

### `/public` - Static Assets
- `/images` - Image assets
- `/documents` - Document storage
- `/uploads` - User uploads

### `/docs` - Documentation
- `/api` - API documentation
- `/features` - Feature guides
- `/setup-guides` - Setup instructions
- `/archive` - Historical documentation

### `/__tests__` - Test Files
- `/api` - API endpoint tests
- `/components` - Component tests
- `/lib` - Service/utility tests
- `/e2e` - End-to-end tests
- `/pages` - Page tests

## Configuration Files

### Root Level
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - TailwindCSS configuration
- `.eslintrc.json` - ESLint rules
- `jest.config.js` - Jest test configuration
- `middleware.ts` - Next.js middleware
- `.env.local` - Environment variables (not in git)
- `.env.example` - Environment template
- `.gitignore` - Git ignore rules

## Naming Conventions

### Files
- **Pages**: `page.tsx` (Next.js convention)
- **API Routes**: `route.ts` (Next.js convention)
- **Components**: `PascalCase.tsx`
- **Utilities**: `kebab-case.ts`
- **Models**: `PascalCase.ts`
- **Tests**: `*.test.ts` or `*.spec.ts`

### Code
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase` with `I` prefix for interfaces
- **Enums**: `PascalCase`

## Import Organization

Imports should be organized in this order:
1. External libraries (React, Next.js, etc.)
2. Internal components
3. Internal utilities/services
4. Types
5. Styles

Example:
```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import { getCurrentUser } from '@/lib/auth';
import { IWorkflow } from '@/lib/types';
import styles from './page.module.css';
```

## Best Practices

### Component Structure
```typescript
'use client'; // If client component

import statements...

interface Props {
  // Props definition
}

export default function ComponentName({ props }: Props) {
  // State
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Handlers
  const handleAction = () => {
    // Handler logic
  };
  
  // Render
  return (
    // JSX
  );
}
```

### API Route Structure
```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    
    // Authentication check
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Business logic
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Code Organization Principles

1. **Separation of Concerns** - Keep UI, business logic, and data access separate
2. **DRY (Don't Repeat Yourself)** - Extract reusable code into utilities
3. **Single Responsibility** - Each file/function should have one clear purpose
4. **Consistent Naming** - Follow established naming conventions
5. **Type Safety** - Use TypeScript types throughout
6. **Error Handling** - Always handle errors gracefully
7. **Documentation** - Comment complex logic and public APIs

## Adding New Features

When adding a new feature:

1. Create model in `/models` if needed
2. Create API routes in `/app/api`
3. Create UI components in `/components`
4. Create page in `/app/dashboard`
5. Add business logic to `/lib`
6. Write tests in `/__tests__`
7. Update documentation in `/docs`

## Maintenance

- Keep dependencies updated
- Run tests before committing
- Follow ESLint rules
- Use TypeScript strictly
- Document breaking changes
- Keep README.md updated
