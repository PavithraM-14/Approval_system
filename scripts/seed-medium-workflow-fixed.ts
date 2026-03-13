#!/usr/bin/env node

/**
 * Medium Workflow Seeding Script (FIXED VERSION)
 * 
 * Creates a medium complexity workflow structure with proper visual grouping:
 * [Enterprise Group] containing:
 *   - [Region Subgroup] (Employee → Manager)
 *   - [Parallel Split] (Legal | Finance | IT)
 *   - [Parallel Join]
 *   - CEO
 * → [Option Node] (Investor | Board | Govt)
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
import CustomRole from '../models/CustomRole.js';
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
  legal: any;
  finance: any;
  it: any;
  ceo: any;
  investor: any;
  board: any;
  govt: any;
}

interface CreatedGroups {
  region: any;
  enterprise: any;
}

interface UserData {
  name: string;
  email: string;
  empId: string;
  password: string;
  contactNo: string;
  role: any;
  department: string;
  region?: string;
  groupAssignments: {
    groupId: any;
    groupType: string;
  }[];
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

async function createSystemAdmin(companyId: any): Promise<any> {
  console.log('Creating system admin...');
  
  // Create System Admin role
  const adminRole = new CustomRole({
    name: 'System Admin',
    description: 'Full system access with all permissions',
    companyId: companyId,
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
  const adminEmail = 'admin@medium.com';
  const adminUser = new User({
    name: 'System Administrator',
    email: adminEmail,
    empId: 'MED-ADM001',
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

async function createMediumRoles(companyId: any): Promise<CreatedRoles> {
  console.log('Creating medium workflow roles...');
  
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
      companyId: companyId,
    },
    {
      name: 'Manager',
      description: 'Regional manager who forwards requests to parallel departments',
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
      companyId: companyId,
    },
    {
      name: 'Legal',
      description: 'Legal department specialist for compliance review',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: true,
        canShare: false,
        canDownload: true,
        canForward: true,
        canManageBudget: false,
        canESign: true,
        canApprove: false,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
    {
      name: 'Finance',
      description: 'Finance department specialist for budget and cost review',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: true,
        canShare: false,
        canDownload: true,
        canForward: true,
        canManageBudget: true,
        canESign: true,
        canApprove: false,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
    {
      name: 'IT',
      description: 'IT department specialist for technical review',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: true,
        canShare: false,
        canDownload: true,
        canForward: true,
        canManageBudget: false,
        canESign: true,
        canApprove: false,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
    {
      name: 'CEO',
      description: 'Chief Executive Officer with enterprise-level approval authority',
      isSystemAdmin: false,
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
      },
      companyId: companyId,
    },
    {
      name: 'Investor',
      description: 'External investor representative for high-value approvals',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canShare: false,
        canDownload: true,
        canForward: false,
        canManageBudget: true,
        canESign: true,
        canApprove: true,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
    {
      name: 'Board',
      description: 'Board of Directors member for strategic approvals',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canShare: true,
        canDownload: true,
        canForward: false,
        canManageBudget: true,
        canESign: true,
        canApprove: true,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
    {
      name: 'Government',
      description: 'Government liaison for regulatory approvals',
      isSystemAdmin: false,
      permissions: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canShare: false,
        canDownload: true,
        canForward: false,
        canManageBudget: false,
        canESign: true,
        canApprove: true,
        canRaiseQueries: true,
      },
      companyId: companyId,
    },
  ];

  const createdRoles: CreatedRoles = {} as CreatedRoles;
  
  for (const roleData of roles) {
    // Check if role already exists
    let role = await CustomRole.findOne({ 
      name: roleData.name, 
      companyId: companyId 
    });
    
    if (!role) {
      role = new CustomRole(roleData);
      await role.save();
      console.log(`  ✓ Created role: ${role.name}`);
    } else {
      console.log(`  → Role already exists: ${role.name}`);
    }
    
    const roleKey = roleData.name.toLowerCase().replace(' ', '');
    (createdRoles as any)[roleKey === 'government' ? 'govt' : roleKey] = role;
  }
  
  return createdRoles;
}

async function createMediumGroups(companyId: any, roles: CreatedRoles): Promise<CreatedGroups> {
  console.log('Creating medium workflow groups...');
  
  const groups = [
    {
      name: 'Region',
      type: 'region',
      description: 'Regional grouping for employees and managers',
      companyId: companyId,
      isActive: true,
    },
    {
      name: 'Enterprise',
      type: 'custom',
      description: 'Enterprise-level group for CEO and executive decisions',
      companyId: companyId,
      isActive: true,
    },
  ];

  const createdGroups: CreatedGroups = {} as CreatedGroups;
  
  for (const groupData of groups) {
    // Check if group already exists
    let group = await Group.findOne({ 
      name: groupData.name, 
      companyId: companyId 
    });
    
    if (!group) {
      group = new Group(groupData);
      await group.save();
      console.log(`  ✓ Created group: ${group.name}`);
    } else {
      console.log(`  → Group already exists: ${group.name}`);
    }
    
    (createdGroups as any)[groupData.name.toLowerCase()] = group;
  }
  
  return createdGroups;
}

async function createMediumWorkflow(companyId: any, roles: CreatedRoles, groups: CreatedGroups): Promise<any> {
  console.log('Creating medium complexity workflow with proper grouping...');
  
  // Check if workflow already exists
  let workflow = await WorkflowConfiguration.findOne({
    name: 'Medium Approval Workflow',
    companyId: companyId,
  });
  
  if (workflow) {
    console.log('  → Medium workflow already exists');
    return workflow;
  }
  
  const dummyUserId = new mongoose.Types.ObjectId();
  
  // Create workflow nodes with proper visual grouping containers
  const nodes = [
    // Start node
    {
      id: 'start-1',
      type: 'start',
      label: 'Start',
      position: { x: 50, y: 300 },
      data: {},
    },
    
    // Enterprise Group Container (Main Group)
    {
      id: 'enterprise-group-1',
      type: 'grouping',
      label: 'Enterprise',
      position: { x: 150, y: 100 },
      data: {
        label: 'Enterprise',
        description: 'Enterprise-level workflow processing',
        groupType: 'enterprise',
        width: 1100,
        height: 400,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderColor: '#3b82f6',
      },
    },
    
    // Region Subgroup Container (inside Enterprise)
    {
      id: 'region-subgroup-1',
      type: 'subgroup',
      label: 'Region',
      position: { x: 170, y: 180 },
      data: {
        label: 'Region',
        description: 'Regional employees and managers',
        subGroupType: 'region',
        level: 1,
        width: 300,
        height: 180,
        backgroundColor: 'rgba(249, 115, 22, 0.05)',
        borderColor: '#f97316',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // Employee (inside Region Subgroup)
    {
      id: 'employee-1',
      type: 'approval',
      label: 'Employee',
      position: { x: 190, y: 220 },
      data: {
        label: 'Employee',
        roleId: roles.employee._id,
        description: 'Regional employee creates request',
        groupScope: {
          enabled: true,
          groupIds: [groups.region._id],
          matchType: 'any',
        },
      },
      parentId: 'region-subgroup-1',
      extent: 'parent',
    },
    
    // Manager (inside Region Subgroup)
    {
      id: 'manager-1',
      type: 'approval',
      label: 'Manager',
      position: { x: 340, y: 220 },
      data: {
        label: 'Manager',
        roleId: roles.manager._id,
        description: 'Regional manager reviews and forwards',
        groupScope: {
          enabled: true,
          groupIds: [groups.region._id],
          matchType: 'any',
        },
      },
      parentId: 'region-subgroup-1',
      extent: 'parent',
    },
    
    // Parallel Split Node (inside Enterprise)
    {
      id: 'parallel-split-1',
      type: 'parallel_split',
      label: 'Parallel Review',
      position: { x: 520, y: 280 },
      data: {
        label: 'Parallel Review',
        description: 'Split for parallel department reviews',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // Legal (inside Enterprise, parallel branch)
    {
      id: 'legal-1',
      type: 'approval',
      label: 'Legal',
      position: { x: 650, y: 150 },
      data: {
        label: 'Legal',
        roleId: roles.legal._id,
        description: 'Legal compliance review',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // Finance (inside Enterprise, parallel branch)
    {
      id: 'finance-1',
      type: 'approval',
      label: 'Finance',
      position: { x: 650, y: 250 },
      data: {
        label: 'Finance',
        roleId: roles.finance._id,
        description: 'Financial and budget review',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // IT (inside Enterprise, parallel branch)
    {
      id: 'it-1',
      type: 'approval',
      label: 'IT',
      position: { x: 650, y: 350 },
      data: {
        label: 'IT',
        roleId: roles.it._id,
        description: 'Technical and security review',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // Parallel Join Node (inside Enterprise)
    {
      id: 'parallel-join-1',
      type: 'parallel_join',
      label: 'Join Reviews',
      position: { x: 800, y: 280 },
      data: {
        label: 'Join Reviews',
        description: 'Wait for all parallel reviews to complete',
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // CEO (inside Enterprise)
    {
      id: 'ceo-1',
      type: 'approval',
      label: 'CEO',
      position: { x: 950, y: 280 },
      data: {
        label: 'CEO',
        roleId: roles.ceo._id,
        description: 'CEO enterprise-level approval',
        groupScope: {
          enabled: true,
          groupIds: [groups.enterprise._id],
          matchType: 'any',
        },
      },
      parentId: 'enterprise-group-1',
      extent: 'parent',
    },
    
    // Option Node for final approvals (outside Enterprise)
    {
      id: 'option-1',
      type: 'options',
      label: 'Final Approval',
      position: { x: 1300, y: 280 },
      data: {
        label: 'Final Approval',
        description: 'Choose appropriate final approver based on request type',
        options: ['Investor Approval', 'Board Approval', 'Government Approval'],
      },
    },
    
    // Final approval nodes (outside Enterprise)
    {
      id: 'investor-1',
      type: 'approval',
      label: 'Investor',
      position: { x: 1450, y: 180 },
      data: {
        label: 'Investor',
        roleId: roles.investor._id,
        description: 'Investor approval for high-value requests',
      },
    },
    {
      id: 'board-1',
      type: 'approval',
      label: 'Board',
      position: { x: 1450, y: 280 },
      data: {
        label: 'Board',
        roleId: roles.board._id,
        description: 'Board approval for strategic decisions',
      },
    },
    {
      id: 'govt-1',
      type: 'approval',
      label: 'Government',
      position: { x: 1450, y: 380 },
      data: {
        label: 'Government',
        roleId: roles.govt._id,
        description: 'Government approval for regulatory compliance',
      },
    },
    
    // End node
    {
      id: 'end-1',
      type: 'end',
      label: 'End',
      position: { x: 1600, y: 280 },
      data: {},
    },
  ];
  
  // Create workflow edges
  const edges = [
    // Main flow
    { id: 'e1', source: 'start-1', target: 'employee-1', type: 'default' },
    { id: 'e2', source: 'employee-1', target: 'manager-1', type: 'default' },
    { id: 'e3', source: 'manager-1', target: 'parallel-split-1', type: 'default' },
    
    // Parallel branches
    { id: 'e4', source: 'parallel-split-1', target: 'legal-1', type: 'default' },
    { id: 'e5', source: 'parallel-split-1', target: 'finance-1', type: 'default' },
    { id: 'e6', source: 'parallel-split-1', target: 'it-1', type: 'default' },
    
    // Join parallel branches
    { id: 'e7', source: 'legal-1', target: 'parallel-join-1', type: 'default' },
    { id: 'e8', source: 'finance-1', target: 'parallel-join-1', type: 'default' },
    { id: 'e9', source: 'it-1', target: 'parallel-join-1', type: 'default' },
    
    // Continue to CEO
    { id: 'e10', source: 'parallel-join-1', target: 'ceo-1', type: 'default' },
    
    // CEO to option node
    { id: 'e11', source: 'ceo-1', target: 'option-1', type: 'default' },
    
    // Option branches
    { id: 'e12', source: 'option-1', target: 'investor-1', type: 'default', label: 'High Value' },
    { id: 'e13', source: 'option-1', target: 'board-1', type: 'default', label: 'Strategic' },
    { id: 'e14', source: 'option-1', target: 'govt-1', type: 'default', label: 'Regulatory' },
    
    // Final approvals to end
    { id: 'e15', source: 'investor-1', target: 'end-1', type: 'default' },
    { id: 'e16', source: 'board-1', target: 'end-1', type: 'default' },
    { id: 'e17', source: 'govt-1', target: 'end-1', type: 'default' },
  ];
  
  // Create the workflow
  workflow = new WorkflowConfiguration({
    name: 'Medium Approval Workflow',
    description: 'Medium complexity workflow with proper visual grouping - Enterprise group contains Region subgroup, parallel processing, and CEO approval',
    companyId: companyId,
    nodes,
    edges,
    isActive: true,
    version: 1,
    createdBy: dummyUserId,
  });
  
  await workflow.save();
  console.log('  ✓ Created medium workflow with proper grouping containers');
  
  return workflow;
}

async function createMediumUsers(companyId: any, roles: CreatedRoles, groups: CreatedGroups): Promise<any[]> {
  console.log('Creating medium workflow users...');
  
  const sampleUsers: UserData[] = [
    // Regional Employees
    {
      name: 'Alice Johnson',
      email: 'alice.johnson@medium.com',
      empId: 'MED-EMP001',
      password: 'password123',
      contactNo: '+1-555-1001',
      role: roles.employee._id,
      department: 'Sales',
      region: 'North',
      groupAssignments: [{ groupId: groups.region._id, groupType: 'region' }],
    },
    {
      name: 'Bob Wilson',
      email: 'bob.wilson@medium.com',
      empId: 'MED-EMP002',
      password: 'password123',
      contactNo: '+1-555-1002',
      role: roles.employee._id,
      department: 'Marketing',
      region: 'South',
      groupAssignments: [{ groupId: groups.region._id, groupType: 'region' }],
    },
    
    // Regional Managers
    {
      name: 'Carol Davis',
      email: 'carol.davis@medium.com',
      empId: 'MED-MGR001',
      password: 'password123',
      contactNo: '+1-555-2001',
      role: roles.manager._id,
      department: 'Sales',
      region: 'North',
      groupAssignments: [{ groupId: groups.region._id, groupType: 'region' }],
    },
    {
      name: 'David Brown',
      email: 'david.brown@medium.com',
      empId: 'MED-MGR002',
      password: 'password123',
      contactNo: '+1-555-2002',
      role: roles.manager._id,
      department: 'Marketing',
      region: 'South',
      groupAssignments: [{ groupId: groups.region._id, groupType: 'region' }],
    },
    
    // Department Specialists (inside Enterprise group)
    {
      name: 'Eva Martinez',
      email: 'eva.martinez@medium.com',
      empId: 'MED-LEG001',
      password: 'password123',
      contactNo: '+1-555-3001',
      role: roles.legal._id,
      department: 'Legal',
      groupAssignments: [{ groupId: groups.enterprise._id, groupType: 'enterprise' }],
    },
    {
      name: 'Frank Taylor',
      email: 'frank.taylor@medium.com',
      empId: 'MED-FIN001',
      password: 'password123',
      contactNo: '+1-555-3002',
      role: roles.finance._id,
      department: 'Finance',
      groupAssignments: [{ groupId: groups.enterprise._id, groupType: 'enterprise' }],
    },
    {
      name: 'Grace Lee',
      email: 'grace.lee@medium.com',
      empId: 'MED-IT001',
      password: 'password123',
      contactNo: '+1-555-3003',
      role: roles.it._id,
      department: 'IT',
      groupAssignments: [{ groupId: groups.enterprise._id, groupType: 'enterprise' }],
    },
    
    // Enterprise Level - CEO
    {
      name: 'Henry Anderson',
      email: 'henry.anderson@medium.com',
      empId: 'MED-CEO001',
      password: 'password123',
      contactNo: '+1-555-4001',
      role: roles.ceo._id,
      department: 'Executive',
      groupAssignments: [{ groupId: groups.enterprise._id, groupType: 'enterprise' }],
    },
    
    // Final Approvers (outside Enterprise group)
    {
      name: 'Irene Clark',
      email: 'irene.clark@medium.com',
      empId: 'MED-INV001',
      password: 'password123',
      contactNo: '+1-555-5001',
      role: roles.investor._id,
      department: 'Investment',
      groupAssignments: [],
    },
    {
      name: 'Jack Thompson',
      email: 'jack.thompson@medium.com',
      empId: 'MED-BRD001',
      password: 'password123',
      contactNo: '+1-555-5002',
      role: roles.board._id,
      department: 'Board',
      groupAssignments: [],
    },
    {
      name: 'Karen White',
      email: 'karen.white@medium.com',
      empId: 'MED-GOV001',
      password: 'password123',
      contactNo: '+1-555-5003',
      role: roles.govt._id,
      department: 'Government Relations',
      groupAssignments: [],
    },
  ];

  const createdUsers = [];

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
        isVerified: true,
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
    
    // Assign to groups
    for (const assignment of userData.groupAssignments) {
      try {
        const existingAssignment = await UserGroupAssignment.findOne({
          userId: user._id,
          groupId: assignment.groupId,
          companyId: companyId,
        });
        
        if (!existingAssignment) {
          const groupAssignment = new UserGroupAssignment({
            userId: user._id,
            groupId: assignment.groupId,
            companyId: companyId,
          });
          
          await groupAssignment.save();
          console.log(`    ✓ Assigned ${userData.name} to ${assignment.groupType} group`);
        } else {
          console.log(`    → ${userData.name} already assigned to ${assignment.groupType} group`);
        }
      } catch (error: any) {
        console.log(`    ⚠ Failed to assign ${userData.name} to group: ${error.message}`);
      }
    }
    
    createdUsers.push(user);
  }
  
  return createdUsers;
}

async function createMediumSignupForms(companyId: any, roles: CreatedRoles, groups: CreatedGroups): Promise<void> {
  console.log('Creating medium workflow signup forms...');
  
  const dummyUserId = new mongoose.Types.ObjectId();
  
  const signupForms = [
    {
      roleId: roles.employee._id,
      roleName: 'Employee',
      fields: [
        { fieldName: 'name', label: 'Full Name', type: 'text', required: true, order: 1 },
        { fieldName: 'email', label: 'Email Address', type: 'email', required: true, order: 2 },
        { fieldName: 'empId', label: 'Employee ID', type: 'text', required: true, order: 3 },
        { fieldName: 'region', label: 'Region', type: 'select', required: true, 
          options: ['North', 'South', 'East', 'West', 'Central'], order: 4 },
        { fieldName: 'department', label: 'Department', type: 'text', required: true, order: 5 },
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
        { fieldName: 'name', label: 'Full Name', type: 'text', required: true, order: 1 },
        { fieldName: 'email', label: 'Email Address', type: 'email', required: true, order: 2 },
        { fieldName: 'empId', label: 'Employee ID', type: 'text', required: true, order: 3 },
        { fieldName: 'region', label: 'Region', type: 'select', required: true, 
          options: ['North', 'South', 'East', 'West', 'Central'], order: 4 },
        { fieldName: 'department', label: 'Department', type: 'text', required: true, order: 5 },
      ],
      requireGroupSelection: true,
      allowedGroupTypes: ['region'],
      groupSelectionMode: 'single',
      isActive: true,
    },
    {
      roleId: roles.ceo._id,
      roleName: 'CEO',
      fields: [
        { fieldName: 'name', label: 'Full Name', type: 'text', required: true, order: 1 },
        { fieldName: 'email', label: 'Email Address', type: 'email', required: true, order: 2 },
        { fieldName: 'empId', label: 'Employee ID', type: 'text', required: true, order: 3 },
      ],
      requireGroupSelection: true,
      allowedGroupTypes: ['custom'],
      groupSelectionMode: 'single',
      isActive: true,
    },
  ];
  
  // Add forms for department specialists
  const departmentRoles = [
    { role: roles.legal, name: 'Legal' },
    { role: roles.finance, name: 'Finance' },
    { role: roles.it, name: 'IT' },
    { role: roles.investor, name: 'Investor' },
    { role: roles.board, name: 'Board' },
    { role: roles.govt, name: 'Government' },
  ];
  
  for (const { role, name } of departmentRoles) {
    signupForms.push({
      roleId: role._id,
      roleName: name,
      fields: [
        { fieldName: 'name', label: 'Full Name', type: 'text', required: true, order: 1 },
        { fieldName: 'email', label: 'Email Address', type: 'email', required: true, order: 2 },
        { fieldName: 'empId', label: 'Employee ID', type: 'text', required: true, order: 3 },
        { fieldName: 'department', label: 'Department', type: 'text', required: false, order: 4 },
      ],
      requireGroupSelection: false,
      allowedGroupTypes: [],
      groupSelectionMode: 'single',
      isActive: true,
    });
  }
  
  for (const formData of signupForms) {
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

async function activateMediumWorkflow(workflow: any): Promise<void> {
  console.log('Activating medium workflow...');
  
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
  
  console.log('  ✓ Medium workflow activated');
}

async function seedMediumWorkflow() {
  try {
    console.log('🌱 Starting medium workflow seeding (FIXED VERSION)...\n');
    
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
    
    // Create medium workflow roles
    const roles = await createMediumRoles(company._id);
    console.log('');
    
    // Create medium workflow groups
    const groups = await createMediumGroups(company._id, roles);
    console.log('');
    
    // Create medium workflow
    const workflow = await createMediumWorkflow(company._id, roles, groups);
    console.log('');
    
    // Create signup forms
    await createMediumSignupForms(company._id, roles, groups);
    console.log('');
    
    // Create sample users
    const users = await createMediumUsers(company._id, roles, groups);
    console.log('');
    
    // Activate the workflow
    await activateMediumWorkflow(workflow);
    console.log('');
    
    console.log('🎉 Medium workflow seeding completed successfully!');
    console.log('\n✨ WORKFLOW STRUCTURE WITH PROPER GROUPING:');
    console.log('  Start → [Enterprise Group] → Option → End');
    console.log('  ');
    console.log('  Inside Enterprise Group:');
    console.log('    • [Region Subgroup]: Employee → Manager');
    console.log('    • Parallel Split → Legal | Finance | IT → Parallel Join');
    console.log('    • CEO');
    console.log('  ');
    console.log('  Outside Enterprise Group:');
    console.log('    • Option Node → Investor | Board | Government');
    
    console.log('\n📦 GROUPS CREATED:');
    console.log('  • Enterprise (Main Group) - Contains all workflow nodes up to CEO');
    console.log('  • Region (Subgroup) - Contains Employee and Manager roles');
    
    console.log('\n👥 ROLES CREATED:');
    console.log('  • Employee (Requester) - Inside Region subgroup');
    console.log('  • Manager (Forwarder) - Inside Region subgroup');
    console.log('  • Legal (Approver) - Inside Enterprise group');
    console.log('  • Finance (Approver) - Inside Enterprise group');
    console.log('  • IT (Approver) - Inside Enterprise group');
    console.log('  • CEO (Approver) - Inside Enterprise group');
    console.log('  • Investor (Final Approver) - Outside groups');
    console.log('  • Board (Final Approver) - Outside groups');
    console.log('  • Government (Final Approver) - Outside groups');
    
    console.log(`\n👤 SAMPLE USERS: ${users.length} users created`);
    console.log('Default password for all users: password123');
    
    // Display login credentials by role
    console.log('\n📋 LOGIN CREDENTIALS BY ROLE:');
    console.log('=====================================');
    
    // Display System Admin credentials first
    console.log('\n🔑 SYSTEM ADMIN:');
    console.log('   Email: admin@medium.com');
    console.log('   Password: adminPassword123');
    console.log('   Name: System Administrator (MED-ADM001)');
    console.log('   ---');
    
    const usersByRole: Record<string, any[]> = {};
    
    // Group users by role for display
    for (const user of users) {
      // Get role through UserRoleAssignment
      const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
      let roleName = 'Unknown';
      
      if (roleAssignment) {
        const role = await CustomRole.findById(roleAssignment.roleId);
        roleName = role?.name || 'Unknown';
      }
      
      if (!usersByRole[roleName]) {
        usersByRole[roleName] = [];
      }
      
      usersByRole[roleName].push({
        name: user.name,
        email: user.email,
        empId: user.empId,
        department: user.department,
      });
    }
    
    // Display credentials for each role
    Object.entries(usersByRole).forEach(([roleName, roleUsers]: [string, any[]]) => {
      console.log(`\n🔑 ${roleName.toUpperCase()} ROLE:`);
      roleUsers.forEach(({ name, email, empId, department }: any) => {
        console.log(`   Email: ${email}`);
        console.log(`   Password: password123`);
        console.log(`   Name: ${name} (${empId})`);
        console.log(`   Department: ${department}`);
        console.log(`   ---`);
      });
    });
    
    console.log('\n💡 TIP: Use any of the above email/password combinations to log in!');
    console.log('🎨 VISUAL GROUPING: You should now see proper visual containers in the workflow builder:');
    console.log('   • Blue dashed border for Enterprise group');
    console.log('   • Orange dashed border for Region subgroup');
    console.log('🚀 The medium workflow is ready with proper visual grouping!');
    
  } catch (error) {
    console.error('✗ Medium workflow seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the seeding script
seedMediumWorkflow();

export { seedMediumWorkflow };
