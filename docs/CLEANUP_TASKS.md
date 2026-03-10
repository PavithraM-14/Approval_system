# Cleanup Tasks

This document tracks technical debt and cleanup tasks that should be addressed.

## High Priority

### 1. Remove CustomRole Model
**Status:** Pending  
**Description:** The `CustomRole` model has been unified with the `Role` model, but some references still exist.

**Files to update:**
- `models/CustomRole.ts` - Can be deleted after updating references
- `models/UserRoleAssignment.ts` - Change ref from 'CustomRole' to 'Role'
- `app/api/roles/[id]/users/[userId]/route.ts` - Update import to use Role
- `components/NodePropertyEditor.tsx` - Rename interface from CustomRole to RoleOption
- `components/RoleManagement.tsx` - Rename interface from CustomRole to Role

**Test files to update:**
- `__tests__/api/roles/post.test.ts`
- `__tests__/api/workflows/activate.test.ts`
- `__tests__/lib/role-service.test.ts`
- `__tests__/e2e/workflow-complete-lifecycle.test.ts`
- `__tests__/lib/workflow-validator.test.ts`
- `__tests__/api/workflows/post.test.ts`
- `__tests__/api/workflows/put.test.ts`
- `__tests__/api/workflows/validate.test.ts`

**Impact:** Low - Tests are mocked, functionality works with Role model

## Medium Priority

### 2. Consolidate Documentation
**Status:** In Progress  
**Description:** Many documentation files were moved to `docs/archive`. Review and consolidate into main docs.

**Actions:**
- Review files in `docs/archive`
- Extract relevant information
- Update main documentation
- Delete obsolete files

### 3. Update Test Coverage
**Status:** Pending  
**Description:** Ensure all new features have adequate test coverage.

**Areas needing tests:**
- Workflow builder UI components
- Role management endpoints
- Company-specific role filtering
- Workflow persistence

### 4. Optimize Database Queries
**Status:** Pending  
**Description:** Review and optimize database queries for performance.

**Areas to review:**
- Request listing queries (add pagination)
- Workflow loading (add caching)
- Role fetching (optimize indexes)
- Audit log queries (add archiving)

## Low Priority

### 5. Code Style Consistency
**Status:** Ongoing  
**Description:** Ensure consistent code style across the codebase.

**Actions:**
- Run Prettier on all files
- Fix ESLint warnings
- Standardize import ordering
- Consistent error handling patterns

### 6. Remove Unused Dependencies
**Status:** Pending  
**Description:** Audit and remove unused npm packages.

**Command:**
```bash
npx depcheck
```

### 7. Update TypeScript Strict Mode
**Status:** Pending  
**Description:** Enable strict mode in tsconfig.json and fix type issues.

**Actions:**
- Enable `strict: true` in tsconfig.json
- Fix type errors
- Add proper type definitions

### 8. Improve Error Messages
**Status:** Pending  
**Description:** Make error messages more user-friendly and actionable.

**Areas:**
- API error responses
- Form validation messages
- Authentication errors
- File upload errors

## Completed

### ✅ Project Structure Organization
**Completed:** 2024  
**Description:** Organized project structure and moved documentation files.

**Changes:**
- Moved all markdown files to `docs/archive`
- Created `docs/setup-guides` for setup scripts
- Created comprehensive README.md
- Added PROJECT_STRUCTURE.md
- Added DEVELOPMENT_GUIDE.md

### ✅ Unified Role Model
**Completed:** 2024  
**Description:** Merged CustomRole and Role models into a single unified Role model.

**Changes:**
- Updated Role model with company field
- Updated API endpoints to use Role
- Updated role-service to use Role
- Updated workflow validator to use Role

### ✅ Workflow Persistence
**Completed:** 2024  
**Description:** Added GET endpoint for workflows to enable persistence.

**Changes:**
- Added GET /api/workflows endpoint
- Auto-load company workflows on page load
- Proper node transformation between DB and UI formats

## Future Enhancements

### Mobile Responsiveness
- Improve mobile UI for workflow builder
- Optimize request details page for mobile
- Add mobile-specific navigation

### Performance Optimization
- Implement Redis caching
- Add CDN for static assets
- Optimize image loading
- Implement lazy loading

### Security Enhancements
- Add rate limiting
- Implement CAPTCHA for login
- Add 2FA support
- Security audit

### Feature Additions
- Advanced analytics dashboard
- Bulk operations
- Export to Excel/PDF
- Advanced search filters
- Workflow templates

## Notes

- Always test changes thoroughly before marking as complete
- Update this document when adding new cleanup tasks
- Prioritize based on impact and effort
- Document any breaking changes
