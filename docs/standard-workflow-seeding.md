# Standard Workflow Seeding

This document explains how to use the standard workflow seeding script to quickly set up a basic approval workflow structure with sample user accounts.

## Overview

The standard workflow seeding script (`npm run standard`) creates a complete workflow setup with:

- **3 Roles**: Employee (Requester), Manager (Forwarder), Boss (Final Approval)
- **1 Group**: Region (contains Employee and Manager roles)
- **1 Workflow**: Linear approval flow
- **Signup Forms**: Configured for all roles with regional selection
- **Sample Users**: 8 test users with login credentials across all roles

## Workflow Structure

```
Start → Employee (Region) → Manager (Region) → Boss → End
```

### Flow Description

1. **Start**: Workflow entry point
2. **Employee (Requester)**: 
   - Creates and submits requests
   - Must belong to a Region group
   - Can view and respond to queries on their requests
3. **Manager (Forwarder)**:
   - Receives requests from employees in the same region
   - Can forward requests to the boss
   - Can raise queries back to employees
   - Must belong to the same Region group as the employee
4. **Boss (Final Approval)**:
   - Receives forwarded requests from managers
   - Has final approval authority
   - Can approve, reject, or raise queries
   - Not tied to any specific region
5. **End**: Workflow completion

## Usage

### Running the Seeding Script

```bash
npm run standard
```

### What Gets Created

#### Roles
- **Employee**
  - Permissions: View, Create, Download
  - Description: Basic employee who can create and view their own requests

- **Manager** 
  - Permissions: View, Create, Edit, Download, Forward, Raise Queries
  - Description: Middle management who forwards requests to final approvers

- **Boss**
  - Permissions: View, Create, Edit, Share, Download, Manage Budget, E-Sign, Final Approval, Raise Queries
  - Description: Final approver with complete approval authority

#### Groups
- **Region**
  - Type: region
  - Contains: Employee and Manager roles
  - Purpose: Ensures employees and managers are grouped by regional location

#### Sample Users
**Employees:**
- John Smith - john.smith@default.com (EMP001) - North region
- Sarah Johnson - sarah.johnson@default.com (EMP002) - South region  
- Mike Davis - mike.davis@default.com (EMP003) - East region

**Managers:**
- Lisa Wilson - lisa.wilson@default.com (MGR001) - North region
- Robert Brown - robert.brown@default.com (MGR002) - South region
- Jennifer Lee - jennifer.lee@default.com (MGR003) - East region

**Bosses:**
- David Anderson - david.anderson@default.com (BOSS001) - Executive
- Maria Garcia - maria.garcia@default.com (BOSS002) - Executive

**Default Password:** `password123` (for all users)

#### Signup Forms
Each role gets a customized signup form:

**Employee & Manager Forms Include:**
- Full Name (required)
- Email Address (required)
- Employee ID (required)
- Region selection (required) - dropdown with: North, South, East, West, Central
- Department (optional for managers only)

**Boss Form Includes:**
- Full Name (required)
- Email Address (required)
- Employee ID (required)
- No regional grouping required

## Regional Grouping Logic

The workflow implements regional grouping where:

1. **Employees** must select a region during signup
2. **Managers** must select the same region they manage
3. **Requests flow** from employee → manager within the same region → boss
4. **Cross-region isolation**: Employees in "North" region can only have their requests handled by managers also in "North" region

## Use Cases

This standard workflow is ideal for:

- **Corporate approval processes** with regional management structure
- **Expense approvals** with regional budget oversight
- **Document approvals** with hierarchical review
- **Purchase requisitions** with regional and executive approval
- **Leave requests** with manager and HR approval

## Customization

After running the seeding script, you can:

1. **Modify roles** in the Role Management page
2. **Add more groups** (departments, cost centers, etc.)
3. **Edit the workflow** in the Workflow Builder
4. **Customize signup forms** for each role
5. **Add more regions** to the Region group options

## Database Impact

The script creates entries in:
- `companies` collection (Default Company if not exists)
- `roles` collection (3 roles)
- `groups` collection (1 region group)
- `workflowconfigurations` collection (1 workflow)
- `signupformconfigurations` collection (3 signup forms)
- `users` collection (8 sample users)
- `usergroupassignments` collection (6 group assignments for employees and managers)

## Idempotency

The script is idempotent - running it multiple times will:
- Skip creation if items already exist
- Only create missing components
- Update the workflow to be active (deactivating others)

## Next Steps

After seeding:

1. **Test the workflow** by logging in as any user and creating a test request
2. **Login credentials**: Use any email from the sample users with password `password123`
3. **Test regional routing**: Create a request as John Smith (North) and see it route to Lisa Wilson (North manager)
4. **Add real users** or modify existing ones as needed for your organization
5. **Customize permissions** as needed for your organization
6. **Set up integrations** (email, document storage, etc.)
7. **Configure notifications** and escalation rules

## Troubleshooting

If the script fails:

1. **Check MongoDB connection** - ensure `.env.local` has correct `MONGODB_URI`
2. **Verify permissions** - ensure database user has write permissions
3. **Check logs** - script provides detailed error messages
4. **Clear and retry** - use `npm run clear-db` if needed (⚠️ destructive)

## Related Commands

- `npm run clear-db` - Clear all data (use with caution)
- `npm run seed` - General seeding script
- `npm run university` - University-specific seeding