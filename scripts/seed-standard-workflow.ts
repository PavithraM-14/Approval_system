#!/usr/bin/env node

/**
 * Standard Workflow Seeding Script
 * 
 * Creates a standard workflow structure:
 * Start -> Employee (Requester) -> Manager (Forwarder) -> Boss (Final Approval) -> End
 * 
 * Both Employee and Manager are grouped under "Region" group
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models
import Company from '../models/Company.js';
import Role from '../models/Role.js';
import Group from '../models/Group.js';
import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import SignupFormConfiguration from '../models/SignupFormConfiguration.js';
import User from '../models/User.js';
import UserGroupAssignment from '../models/UserGroupAssignment.js';
import UserRoleAssignment from '../models/UserRoleAssignment.js';

// Type definitions
interface CreatedRoles {
  employee: any;
  manager: any;
  boss: any;
}

interface UserData {
  name: string;
  email: string;
  empId: string;
  password: string;
  contactNo: string;
  role: any;
  department: string;
  region: string | null;
  needsGroupAssignment: boolean;
}

interface CreatedUser {
  user: any;
  region: string | null;
  roleName: string;
}

async function clearAllData(): Promise<void> {
  console.log('🗑️ Clearing all existing data...');
  
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('  → Database is already empty');
      return;
    }

    console.log(`  → Found ${collections.length} collections to clear`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`    • Dropping collection: ${collectionName}`);
      await db.dropCollection(collectionName);
    }

    console.log('  ✓ All data cleared successfully');
  } catch (error: any) {
    console.error('  ✗ Error clearing data:', error.message);
    throw error;
  }
}

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createStandardRoles(companyId: any): Promise<CreatedRoles> {
  console.log('Creating standard roles...');
  
  const roles = [
    {
      name: 'Employee',
      description: 'Basic employee who can create and view their own requests',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canShare: false,
        canDownload: true,
        canForward: false,
        canManageBudget: false,
        canESign: false,
        canApprove: false,
        canRaiseQueries: false,
      },
      company: companyId,
    },
    {
      name: 'Manager',
      description: 'Middle management who forwards requests to final approvers',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canShare: false,
        canDownload: true,
        canForward: true,
        canManageBudget: false,
        canESign: false,
        canApprove: false,
        canRaiseQueries: true,
      },
      company: companyId,
    },
    {
      name: 'Boss',
      description: 'Final approver with complete approval authority',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canShare: true,
        canDownload: true,
        canForward: false,
        canManageBudget: true,
        canESign: true,
        canApprove: true,
        canRaiseQueries: true,
      },
      company: companyId,
    },
  ];

  const createdRoles: CreatedRoles = {} as CreatedRoles;
  
  for (const roleData of roles) {
    const role = new Role(roleData);
    await role.save();
    console.log(`  ✓ Created role: ${role.name}`);
    
    (createdRoles as any)[roleData.name.toLowerCase()] = role;
  }
  
  return createdRoles;
}

async function createRegionGroup(companyId: any, employeeRole: any, managerRole: any): Promise<any> {
  console.log('Creating Region group...');
  
  const group = new Group({
    name: 'Region',
    type: 'region',
    description: 'Regional grouping for employees and managers',
    companyId: companyId,
    isActive: true,
  });
  
  await group.save();
  console.log('  ✓ Created Region group');
  
  return group;
}

async function createStandardWorkflow(companyId: any, roles: CreatedRoles, regionGroup: any): Promise<any> {
  console.log('Creating standard workflow...');
  
  // Check if workflow already exists
  let workflow = await WorkflowConfiguration.findOne({
    name: 'Standard Approval Workflow',
    companyId: companyId,
  });
  
  if (workflow) {
    console.log('  → Standard workflow already exists');
    return workflow;
  }
  
  // Create a dummy user ID for createdBy (we'll use the company admin)
  // In a real scenario, this would be the actual user creating the workflow
  const dummyUserId = new mongoose.Types.ObjectId();
  
  // Create workflow nodes with visual grouping container
  const nodes = [
    {
      id: 'start-1',
      type: 'start',
      label: 'Start',
      position: { x: 100, y: 200 },
      data: {},
    },
    {
      id: 'region-group-1',
      type: 'grouping',
      label: 'Region',
      position: { x: 280, y: 120 },
      data: {
        label: 'Region',
        description: 'Regional employees and managers',
        groupType: 'region',
        width: 280,
        height: 160,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderColor: '#3b82f6',
      },
    },
    {
      id: 'employee-1',
      type: 'approval',
      label: 'Employee',
      position: { x: 300, y: 160 },
      data: {
        label: 'Employee',
        roleId: roles.employee._id,
        description: 'Request creator and initial processor',
        groupScope: {
          enabled: true,
          groupIds: [regionGroup._id],
          matchType: 'any',
        },
      },
      parentId: 'region-group-1',
      extent: 'parent',
    },
    {
      id: 'manager-1',
      type: 'approval',
      label: 'Manager',
      position: { x: 450, y: 160 },
      data: {
        label: 'Manager',
        roleId: roles.manager._id,
        description: 'Regional manager who forwards to boss',
        groupScope: {
          enabled: true,
          groupIds: [regionGroup._id],
          matchType: 'any',
        },
      },
      parentId: 'region-group-1',
      extent: 'parent',
    },
    {
      id: 'boss-1',
      type: 'approval',
      label: 'Boss',
      position: { x: 620, y: 200 },
      data: {
        label: 'Boss',
        roleId: roles.boss._id,
        description: 'Final approver',
      },
    },
    {
      id: 'end-1',
      type: 'end',
      label: 'End',
      position: { x: 800, y: 200 },
      data: {},
    },
  ];
  
  // Create workflow edges
  const edges = [
    {
      id: 'e1',
      source: 'start-1',
      target: 'employee-1',
      type: 'default',
    },
    {
      id: 'e2',
      source: 'employee-1',
      target: 'manager-1',
      type: 'default',
    },
    {
      id: 'e3',
      source: 'manager-1',
      target: 'boss-1',
      type: 'default',
    },
    {
      id: 'e4',
      source: 'boss-1',
      target: 'end-1',
      type: 'default',
    },
  ];
  
  // Create the workflow
  workflow = new WorkflowConfiguration({
    name: 'Standard Approval Workflow',
    description: 'Standard three-tier approval workflow with regional grouping',
    companyId: companyId,
    nodes,
    edges,
    isActive: true,
    version: 1,
    createdBy: dummyUserId,
  });
  
  await workflow.save();
  console.log('  ✓ Created standard workflow');
  
  return workflow;
}

async function createSystemAdmin(companyId: any): Promise<any> {
  console.log('Creating system admin...');
  
  // Create System Admin role
  const adminRole = new Role({
    name: 'System Admin',
    description: 'Full system access with all permissions',
    company: companyId,
    isSystemAdmin: true,
    permissions: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canShare: true,
      canDownload: true,
      canForward: true,
      canManageBudget: true,
      canESign: true,
      canApprove: true,
      canRaiseQueries: true,
    }
  });
  await adminRole.save();
  console.log('  ✓ Created System Admin role');

  // Create System Admin user
  const adminEmail = 'admin@default.com';
  const adminUser = new User({
    name: 'System Administrator',
    email: adminEmail,
    empId: 'SMALL-ADM001',
    password: 'adminPassword123',
    role: adminRole._id,
    company: companyId,
    contactNo: '+1-555-0000',
    isVerified: true,
    isActive: true,
  });
  await adminUser.save();
  console.log('  ✓ Created System Admin user');

  // Create UserRoleAssignment for admin
  const roleAssignment = new UserRoleAssignment({
    userId: adminUser._id,
    roleId: adminRole._id,
    companyId: companyId,
  });
  await roleAssignment.save();
  console.log('  ✓ Created role assignment for System Admin');

  return { adminUser, adminRole };
}

async function createSampleUsers(companyId: any, roles: CreatedRoles, regionGroup: any): Promise<CreatedUser[]> {
  console.log('Creating sample users...');
  
  const sampleUsers: UserData[] = [
    // Employee users in different regions
    {
      name: 'John Smith',
      email: 'john.smith@default.com',
      empId: 'EMP001',
      password: 'password123',
      contactNo: '+1-555-0101',
      role: roles.employee._id,
      department: 'Sales',
      region: 'North',
      needsGroupAssignment: true,
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@default.com',
      empId: 'EMP002',
      password: 'password123',
      contactNo: '+1-555-0102',
      role: roles.employee._id,
      department: 'Marketing',
      region: 'South',
      needsGroupAssignment: true,
    },
    {
      name: 'Mike Davis',
      email: 'mike.davis@default.com',
      empId: 'EMP003',
      password: 'password123',
      contactNo: '+1-555-0103',
      role: roles.employee._id,
      department: 'Engineering',
      region: 'East',
      needsGroupAssignment: true,
    },
    
    // Manager users in different regions
    {
      name: 'Lisa Wilson',
      email: 'lisa.wilson@default.com',
      empId: 'MGR001',
      password: 'password123',
      contactNo: '+1-555-0201',
      role: roles.manager._id,
      department: 'Sales',
      region: 'North',
      needsGroupAssignment: true,
    },
    {
      name: 'Robert Brown',
      email: 'robert.brown@default.com',
      empId: 'MGR002',
      password: 'password123',
      contactNo: '+1-555-0202',
      role: roles.manager._id,
      department: 'Marketing',
      region: 'South',
      needsGroupAssignment: true,
    },
    {
      name: 'Jennifer Lee',
      email: 'jennifer.lee@default.com',
      empId: 'MGR003',
      password: 'password123',
      contactNo: '+1-555-0203',
      role: roles.manager._id,
      department: 'Engineering',
      region: 'East',
      needsGroupAssignment: true,
    },
    
    // Boss users (no regional assignment needed)
    {
      name: 'David Anderson',
      email: 'david.anderson@default.com',
      empId: 'BOSS001',
      password: 'password123',
      contactNo: '+1-555-0301',
      role: roles.boss._id,
      department: 'Executive',
      region: null,
      needsGroupAssignment: false,
    },
    {
      name: 'Maria Garcia',
      email: 'maria.garcia@default.com',
      empId: 'BOSS002',
      password: 'password123',
      contactNo: '+1-555-0302',
      role: roles.boss._id,
      department: 'Executive',
      region: null,
      needsGroupAssignment: false,
    },
  ];

  const createdUsers: CreatedUser[] = [];

  for (const userData of sampleUsers) {
    // Check if user already exists
    let user = await User.findOne({ 
      email: userData.email 
    });
    
    if (!user) {
      user = new User({
        name: userData.name,
        email: userData.email,
        empId: userData.empId,
        password: userData.password,
        contactNo: userData.contactNo,
        role: userData.role,
        company: companyId,
        department: userData.department,
        isActive: true,
        isVerified: true, // Skip email verification for seeded users
      });
      
      await user.save();
      console.log(`  ✓ Created user: ${userData.name} (${userData.empId})`);
    } else {
      console.log(`  → User already exists: ${userData.name} (${userData.empId})`);
    }
    
    // Create UserRoleAssignment for proper role linking
    try {
      const existingRoleAssignment = await UserRoleAssignment.findOne({
        userId: user._id,
        roleId: userData.role,
        companyId: companyId,
      });
      
      if (!existingRoleAssignment) {
        const roleAssignment = new UserRoleAssignment({
          userId: user._id,
          roleId: userData.role,
          companyId: companyId,
        });
        
        await roleAssignment.save();
        console.log(`    ✓ Created role assignment for ${userData.name}`);
      } else {
        console.log(`    → Role assignment already exists for ${userData.name}`);
      }
    } catch (error: any) {
      console.log(`    ⚠ Failed to create role assignment for ${userData.name}: ${error.message}`);
    }
    
    // Assign to region group if needed
    if (userData.needsGroupAssignment && userData.region) {
      try {
        // Check if assignment already exists
        const existingAssignment = await UserGroupAssignment.findOne({
          userId: user._id,
          groupId: regionGroup._id,
          companyId: companyId,
        });
        
        if (!existingAssignment) {
          const assignment = new UserGroupAssignment({
            userId: user._id,
            groupId: regionGroup._id,
            companyId: companyId,
          });
          
          await assignment.save();
          console.log(`    ✓ Assigned ${userData.name} to Region group`);
        } else {
          console.log(`    → ${userData.name} already assigned to Region group`);
        }
      } catch (error: any) {
        console.log(`    ⚠ Failed to assign ${userData.name} to group: ${error.message}`);
      }
    }
    
    createdUsers.push({
      user,
      region: userData.region,
      roleName: userData.role === roles.employee._id ? 'Employee' : 
                userData.role === roles.manager._id ? 'Manager' : 'Boss'
    });
  }
  
  return createdUsers;
}

async function createSignupForms(companyId: any, roles: CreatedRoles, regionGroup: any): Promise<void> {
  console.log('Creating signup form configurations...');
  
  // Create a dummy user ID for createdBy
  const dummyUserId = new mongoose.Types.ObjectId();
  
  const signupForms = [
    {
      roleId: roles.employee._id,
      roleName: 'Employee',
      fields: [
        {
          fieldName: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
          order: 1,
        },
        {
          fieldName: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter your email address',
          order: 2,
        },
        {
          fieldName: 'empId',
          label: 'Employee ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your employee ID',
          order: 3,
        },
        {
          fieldName: 'region',
          label: 'Region',
          type: 'select',
          required: true,
          options: ['North', 'South', 'East', 'West', 'Central'],
          helpText: 'Select your regional location',
          order: 4,
        },
      ],
      requireGroupSelection: true,
      allowedGroupTypes: ['region'],
      groupSelectionMode: 'single',
      isActive: true,
    },
    {
      roleId: roles.manager._id,
      roleName: 'Manager',
      fields: [
        {
          fieldName: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
          order: 1,
        },
        {
          fieldName: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter your email address',
          order: 2,
        },
        {
          fieldName: 'empId',
          label: 'Employee ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your employee ID',
          order: 3,
        },
        {
          fieldName: 'region',
          label: 'Region',
          type: 'select',
          required: true,
          options: ['North', 'South', 'East', 'West', 'Central'],
          helpText: 'Select your regional location for management',
          order: 4,
        },
        {
          fieldName: 'department',
          label: 'Department',
          type: 'text',
          required: false,
          placeholder: 'Enter your department (optional)',
          order: 5,
        },
      ],
      requireGroupSelection: true,
      allowedGroupTypes: ['region'],
      groupSelectionMode: 'single',
      isActive: true,
    },
    {
      roleId: roles.boss._id,
      roleName: 'Boss',
      fields: [
        {
          fieldName: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name',
          order: 1,
        },
        {
          fieldName: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter your email address',
          order: 2,
        },
        {
          fieldName: 'empId',
          label: 'Employee ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your employee ID',
          order: 3,
        },
      ],
      requireGroupSelection: false,
      allowedGroupTypes: [],
      groupSelectionMode: 'single',
      isActive: true,
    },
  ];
  
  for (const formData of signupForms) {
    // Check if signup form already exists
    let existingForm = await SignupFormConfiguration.findOne({
      roleId: formData.roleId,
      companyId: companyId,
    });
    
    if (!existingForm) {
      const signupForm = new SignupFormConfiguration({
        ...formData,
        companyId: companyId,
        createdBy: dummyUserId,
      });
      
      await signupForm.save();
      console.log(`  ✓ Created signup form for: ${formData.roleName}`);
    } else {
      console.log(`  → Signup form already exists for: ${formData.roleName}`);
    }
  }
}

async function activateWorkflow(workflow: any): Promise<void> {
  console.log('Activating standard workflow...');
  
  // Deactivate any existing active workflows for this company
  await WorkflowConfiguration.updateMany(
    { 
      companyId: workflow.companyId,
      isActive: true,
      _id: { $ne: workflow._id }
    },
    { isActive: false }
  );
  
  // Ensure this workflow is active
  workflow.isActive = true;
  await workflow.save();
  
  console.log('  ✓ Standard workflow activated');
}

async function seedStandardWorkflow() {
  try {
    console.log('🌱 Starting standard workflow seeding...\n');
    
    await connectDB();
    
    // Clear all existing data
    await clearAllData();
    console.log('');
    
    // Find or create a default company
    const company = new Company({
      name: 'Default Company',
      adminEmail: 'admin@default.com',
      adminContactNo: '+1-555-0123',
      isActive: true,
    });
    await company.save();
    console.log('✓ Created default company\n');
    
    // Create system admin
    const { adminUser, adminRole } = await createSystemAdmin(company._id);
    console.log('');
    
    // Create standard roles
    const roles = await createStandardRoles(company._id);
    console.log('');
    
    // Create region group
    const regionGroup = await createRegionGroup(company._id, roles.employee, roles.manager);
    console.log('');
    
    // Create standard workflow
    const workflow = await createStandardWorkflow(company._id, roles, regionGroup);
    console.log('');
    
    // Create signup forms
    await createSignupForms(company._id, roles, regionGroup);
    console.log('');
    
    // Create sample users
    const users = await createSampleUsers(company._id, roles, regionGroup);
    console.log('');
    
    // Activate the workflow
    await activateWorkflow(workflow);
    console.log('');
    
    console.log('🎉 Standard workflow seeding completed successfully!');
    console.log('\nCreated structure:');
    console.log('  Start → [Region Group: Employee → Manager] → Boss → End');
    console.log('\nRoles created:');
    console.log('  • Employee (Requester) - Can create requests');
    console.log('  • Manager (Forwarder) - Can forward requests');
    console.log('  • Boss (Final Approval) - Can approve requests');
    console.log('\nGroups created:');
    console.log('  • Region - Visual container with Employee and Manager roles');
    console.log('\nSample users created:');
    
    // Group users by role for display
    const usersByRole: Record<string, any[]> = users.reduce((acc: Record<string, any[]>, { user, region, roleName }: CreatedUser) => {
      if (!acc[roleName]) acc[roleName] = [];
      acc[roleName].push({ name: user.name, email: user.email, empId: user.empId, region });
      return acc;
    }, {});
    
    Object.entries(usersByRole).forEach(([roleName, roleUsers]: [string, any[]]) => {
      console.log(`\n  ${roleName}s:`);
      roleUsers.forEach(({ name, email, empId, region }: { name: string; email: string; empId: string; region: string | null }) => {
        const regionInfo = region ? ` (${region} region)` : '';
        console.log(`    • ${name} - ${email} (${empId})${regionInfo}`);
      });
    });
    
    console.log('\nDefault password for all users: password123');
    console.log('\nSignup forms configured for all roles with regional selection.');
    
    // Display login credentials by role
    console.log('\n📋 LOGIN CREDENTIALS BY ROLE:');
    console.log('=====================================');
    
    // Display System Admin credentials first
    console.log('\n🔑 SYSTEM ADMIN:');
    console.log('   Email: admin@default.com');
    console.log('   Password: adminPassword123');
    console.log('   Name: System Administrator (SMALL-ADM001)');
    console.log('   Department: Administration');
    console.log('   ---');
    
    const usersByRoleDetailed: Record<string, any[]> = {};
    
    // Group users by role for display
    for (const { user, region, roleName } of users) {
      if (!usersByRoleDetailed[roleName]) {
        usersByRoleDetailed[roleName] = [];
      }
      
      usersByRoleDetailed[roleName].push({
        name: user.name,
        email: user.email,
        empId: user.empId,
        department: user.department,
        region: region,
      });
    }
    
    // Display credentials for each role
    Object.entries(usersByRoleDetailed).forEach(([roleName, roleUsers]: [string, any[]]) => {
      console.log(`\n🔑 ${roleName.toUpperCase()} ROLE:`);
      roleUsers.forEach(({ name, email, empId, department, region }: any) => {
        console.log(`   Email: ${email}`);
        console.log(`   Password: password123`);
        console.log(`   Name: ${name} (${empId})`);
        console.log(`   Department: ${department}`);
        if (region) console.log(`   Region: ${region}`);
        console.log(`   ---`);
      });
    });
    
    console.log('\n💡 TIP: Use any of the above email/password combinations to log in and test the workflow!');
    console.log('🚀 The standard workflow is now ready for testing with visual regional grouping container.');
    console.log('📋 The Employee and Manager nodes are now contained within a Region group container on the canvas.');
    
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the seeding script
seedStandardWorkflow();

export { seedStandardWorkflow };