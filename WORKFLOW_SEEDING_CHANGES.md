# Workflow Seeding Changes Summary

## Overview

All workflow seeding scripts have been updated to include **complete data clearing** before creating new data. This ensures a clean slate for each workflow run and prevents conflicts between different workflow setups.

## Key Changes Made

### 1. **Data Clearing Functionality**
- Added `clearAllData()` function to all seeding scripts
- Automatically drops all existing collections before creating new data
- Provides clear logging of what collections are being cleared

### 2. **System Admin Creation**
- Each workflow now creates its own dedicated System Admin user
- Unique empIds for each workflow to prevent conflicts:
  - Small: `SMALL-ADM001`
  - Medium: `MED-ADM001` 
  - Large: `LARGE-ADM001`
  - University: `UNI-ADM001`

### 3. **Removed Existing Data Checks**
- Eliminated all "find existing" logic since data is cleared first
- Simplified code by removing conditional creation logic
- All entities are now created fresh every time

### 4. **Unique User Identifiers**
- Updated medium workflow users to have `MED-` prefixed empIds
- Prevents duplicate key errors when switching between workflows
- Each workflow maintains its own user namespace

## Script Behavior

### Before Changes
- Scripts would check for existing data and skip creation if found
- Could lead to mixed data from different workflow runs
- Potential conflicts with duplicate empIds and emails

### After Changes
- **Complete data wipe** on every run
- Fresh creation of all entities
- No conflicts between different workflow setups
- Clean, predictable state for each workflow

## Usage Impact

### ⚠️ **IMPORTANT WARNING**
Running any seeding script will now **DELETE ALL EXISTING DATA** in the database. This includes:
- All users (including previously created admins)
- All companies
- All roles and permissions
- All workflows
- All groups and assignments
- All requests and documents
- All other application data

### Recommended Workflow
1. Choose the workflow you want to test
2. Run the corresponding npm script
3. Use the provided login credentials for that workflow
4. To switch workflows, simply run a different script (it will clear and recreate everything)

## Available Scripts

| Script | Command | System Admin Email | Company |
|--------|---------|-------------------|---------|
| Small | `npm run small` | `admin@default.com` | Default Company |
| Medium | `npm run medium` | `admin@medium.com` | Default Company |
| Large | `npm run large` | `admin@global-ent.com` | Global Enterprise Solutions |
| University | `npm run university` | `admin@fenma.edu` | Fenma University |

## Benefits

1. **Clean Testing Environment**: Each run provides a fresh, predictable state
2. **No Data Conflicts**: Eliminates issues with duplicate keys or mixed data
3. **Simplified Debugging**: Known starting state makes troubleshooting easier
4. **Workflow Isolation**: Each workflow can be tested independently
5. **Consistent Results**: Same output every time a script is run

## Logging

Each script now provides clear logging showing:
- Number of collections being cleared
- Names of collections being dropped
- Confirmation of successful data clearing
- Creation of new entities with success indicators

This ensures full transparency about what data operations are being performed.