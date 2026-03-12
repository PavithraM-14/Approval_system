import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Company from '../models/Company';
import Role from '../models/Role';
import User from '../models/User';
import Group from '../models/Group';
import UserGroupAssignment from '../models/UserGroupAssignment';
import WorkflowConfiguration, { IWorkflowNode, IWorkflowEdge } from '../models/WorkflowConfiguration';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sead';

const roleNames = [
  'Employee',
  'Team Lead',
  'Regional Director',
  'Global VP',
  'Tax',
  'Legal',
  'Security',
  'CEO',
  'Board',
  'Investors',
  'Regulators'
];

async function createSystemAdmin(companyId: any): Promise<any> {
  console.log('Creating system admin...');
  
  // Create System Admin role
  const adminRole = await Role.create({
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
  console.log('  ✓ Created System Admin role');

  // Create System Admin user
  const adminEmail = 'admin@global-ent.com';
  const adminUser = await User.create({
    name: 'System Administrator',
    email: adminEmail,
    empId: 'LARGE-ADM001',
    password: 'adminPassword123',
    role: adminRole._id,
    company: companyId,
    contactNo: '+1-555-0000',
    isVerified: true,
    isActive: true,
  });
  console.log('  ✓ Created System Admin user');

  return { adminUser, adminRole };
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

async function seedLargeWorkflow() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    // Clear all existing data
    await clearAllData();
    console.log('');

    // 1. Create Company
    const company = await Company.create({
      name: 'Global Enterprise Solutions',
      industry: 'Technology',
      size: '10000+',
      plan: 'enterprise',
      adminEmail: 'admin@global-ent.com',
      adminContactNo: '1234567890'
    });
    console.log('Created Company:', company.name);
    const companyId = company._id;

    // Create system admin
    const { adminUser, adminRole } = await createSystemAdmin(companyId);
    console.log('');

    // 2. Create Groups
    // Enterprise Group (Parent)
    let enterpriseGroup = await Group.findOne({ name: 'Enterprise Group', companyId });
    if (!enterpriseGroup) {
      enterpriseGroup = await Group.create({
        companyId,
        name: 'Enterprise Group',
        type: 'custom',
        description: 'Main Global Group'
      });
      console.log('Created Group: Enterprise Group');
    }

    // Country Subgroup
    let countryGroup = await Group.findOne({ name: 'Country Subgroup', companyId });
    if (!countryGroup) {
      countryGroup = await Group.create({
        companyId,
        name: 'Country Subgroup',
        type: 'region',
        parentGroupId: enterpriseGroup._id,
        description: 'Regional Country Subgroup'
      });
      console.log('Created Group: Country Subgroup');
    }

    // 3. Create Roles & Users
    const rolesMap: Record<string, any> = {};
    const usersMap: Record<string, any> = {};

    for (const rName of roleNames) {
      // Role
      let role = await Role.findOne({ name: rName, company: companyId });
      if (!role) {
        role = await Role.create({
          name: rName,
          company: companyId,
          isSystemAdmin: rName === 'CEO',
          permissions: {
            canView: true,
            canCreate: rName === 'Employee',
            canEdit: false,
            canShare: false,
            canDownload: true,
            canForward: true,
            canManageBudget: false,
            canESign: false,
            canApprove: true,
            canRaiseQueries: true,
          }
        });
        console.log(`Created Role: ${rName}`);
      }
      rolesMap[rName] = role;

      // User
      const normalizedName = rName.toLowerCase().replace(/ /g, '_');
      const email = `${normalizedName}@global-ent.com`;
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          name: rName,
          empId: `EMP-${Math.floor(Math.random() * 90000) + 10000}`,
          password: 'password123',
          role: role._id,
          company: companyId,
          contactNo: '1234567890',
          isActive: true
        });
        console.log(`Created User: ${rName} (${email})`);
      }
      usersMap[rName] = user;

      // Group Assignment
      // Employee, Team Lead -> Country Subgroup
      // Everyone else -> Enterprise Group
      const inCountryGroup = ['Employee', 'Team Lead'];
      const targetGroup = inCountryGroup.includes(rName) ? countryGroup : enterpriseGroup;

      const assignmentExists = await UserGroupAssignment.findOne({
        userId: user._id,
        groupId: targetGroup._id,
        companyId
      });

      if (!assignmentExists) {
        await UserGroupAssignment.create({
          userId: user._id,
          groupId: targetGroup._id,
          companyId
        });
        console.log(`Assigned User ${rName} to Group ${targetGroup.name}`);
      }
    }

    // 4. Create Workflow Configuration
    let workflow = await WorkflowConfiguration.findOne({ name: 'Large Global Workflow', companyId });
    if (workflow) {
      console.log('Workflow already exists. Deleting it to recreate...');
      await WorkflowConfiguration.deleteOne({ _id: workflow._id });
    }

    // Nodes and Edges
    const nodes: IWorkflowNode[] = [];
    const edges: IWorkflowEdge[] = [];
    
    const addNode = (id: string, type: 'start' | 'end' | 'approval' | 'parallel_split' | 'parallel_join' | 'options', label: string, roleName?: string, x: number = 0, y: number = 0, optionsArray?: string[]) => {
      nodes.push({
        id,
        type,
        label,
        position: { x, y },
        data: {
          roleId: roleName ? rolesMap[roleName]._id : undefined,
          description: `Node for ${label}`,
          options: optionsArray
        }
      });
    };

    const addEdge = (source: string, target: string, label?: string) => {
      edges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        type: 'default',
        label
      });
    };

    // Layout values
    let y = 50;
    const dy = 80;

    // Start
    addNode('start', 'start', 'Start', undefined, 300, y); y += dy;
    
    // Employee
    addNode('employee', 'approval', 'Employee', 'Employee', 300, y); y += dy;
    addEdge('start', 'employee');

    // Team Lead
    addNode('team_lead', 'approval', 'Team Lead', 'Team Lead', 300, y); y += dy;
    addEdge('employee', 'team_lead');

    // Parallel Split 1 (Regional Director | Global VP)
    addNode('split_1', 'parallel_split', 'Parallel Split', undefined, 300, y); y += dy;
    addEdge('team_lead', 'split_1');

    addNode('regional_director', 'approval', 'Regional Director', 'Regional Director', 150, y);
    addNode('global_vp', 'approval', 'Global VP', 'Global VP', 450, y);
    y += dy;

    addEdge('split_1', 'regional_director');
    addEdge('split_1', 'global_vp');

    addNode('join_1', 'parallel_join', 'Join 1', undefined, 300, y); y += dy;
    addEdge('regional_director', 'join_1');
    addEdge('global_vp', 'join_1');

    // Parallel Split 2 (Tax | Legal | Security)
    addNode('split_2', 'parallel_split', 'Parallel Split', undefined, 300, y); y += dy;
    addEdge('join_1', 'split_2');

    addNode('tax', 'approval', 'Tax', 'Tax', 100, y);
    addNode('legal', 'approval', 'Legal', 'Legal', 300, y);
    addNode('security', 'approval', 'Security', 'Security', 500, y);
    y += dy;

    addEdge('split_2', 'tax');
    addEdge('split_2', 'legal');
    addEdge('split_2', 'security');

    addNode('join_2', 'parallel_join', 'Join 2', undefined, 300, y); y += dy;
    addEdge('tax', 'join_2');
    addEdge('legal', 'join_2');
    addEdge('security', 'join_2');

    // CEO
    addNode('ceo', 'approval', 'CEO', 'CEO', 300, y); y += dy;
    addEdge('join_2', 'ceo');

    // Options Node (Board | Investors | Regulators)
    addNode('options_node', 'options', 'Final Review Options', undefined, 300, y, ['Board', 'Investors', 'Regulators']); y += dy;
    addEdge('ceo', 'options_node');

    addNode('board', 'approval', 'Board', 'Board', 100, y);
    addNode('investors', 'approval', 'Investors', 'Investors', 300, y);
    addNode('regulators', 'approval', 'Regulators', 'Regulators', 500, y);
    y += dy;

    addEdge('options_node', 'board', 'Board');
    addEdge('options_node', 'investors', 'Investors');
    addEdge('options_node', 'regulators', 'Regulators');

    // End
    addNode('end', 'end', 'End', undefined, 300, y);
    addEdge('board', 'end');
    addEdge('investors', 'end');
    addEdge('regulators', 'end');

    workflow = await WorkflowConfiguration.create({
      companyId,
      name: 'Large Global Workflow',
      description: 'Seed workflow based on complex cross-functional global flow',
      version: 1,
      isActive: true,
      nodes,
      edges,
      createdBy: usersMap['CEO']._id
    });

    console.log('Created Workflow Configuration:', workflow.name);

    console.log('\n--- Seed Complete ---');
    console.log('Login Details (Password is password123 for roles, adminPassword123 for admin):');
    console.log('- System Admin: admin@global-ent.com (adminPassword123)');
    for (const rName of roleNames) {
      const email = `${rName.toLowerCase().replace(/ /g, '_')}@global-ent.com`;
      console.log(`- ${rName}: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
}

seedLargeWorkflow();
