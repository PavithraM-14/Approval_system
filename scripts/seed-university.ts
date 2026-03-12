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
  'Faculty',
  'HOD',
  'Institution Manager',
  'Accountant',
  'SOP Verifier',
  'Security',
  'VP Admin',
  'VP Academics',
  'Principal',
  'Dean',
  'Chairman'
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
  const adminEmail = 'admin@fenma.edu';
  const adminUser = await User.create({
    name: 'System Administrator',
    email: adminEmail,
    empId: 'UNI-ADM001',
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

async function seedUniversity() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    // Clear all existing data
    await clearAllData();
    console.log('');

    // 1. Create Company
    const company = await Company.create({
      name: 'Fenma University',
      industry: 'Education',
      size: '1000-5000',
      plan: 'enterprise',
      adminEmail: 'admin@fenma.edu',
      adminContactNo: '1234567890'
    });
    console.log('Created Company:', company.name);
    const companyId = company._id;

    // Create system admin
    const { adminUser, adminRole } = await createSystemAdmin(companyId);
    console.log('');

    // 2. Create Groups
    // Root group: College
    let collegeGroup = await Group.findOne({ name: 'College', companyId });
    if (!collegeGroup) {
      collegeGroup = await Group.create({
        companyId,
        name: 'College',
        type: 'custom',
        description: 'Main College Group'
      });
      console.log('Created Group: College');
    }

    // Subgroup: Department
    let deptGroup = await Group.findOne({ name: 'Department', companyId });
    if (!deptGroup) {
      deptGroup = await Group.create({
        companyId,
        name: 'Department',
        type: 'department',
        parentGroupId: collegeGroup._id,
        description: 'Academic Department'
      });
      console.log('Created Group: Department');
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
          isSystemAdmin: rName === 'Chairman' || rName === 'Institution Manager',
          permissions: {
            canView: true,
            canCreate: rName === 'Faculty',
            canEdit: false,
            canShare: false,
            canDownload: true,
            canForward: true,
            canManageBudget: rName === 'Accountant',
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
      const email = `${normalizedName}@fenma.edu`;
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
      // Faculty and HOD in Department, others in College (up to Principal)
      // Wait: "until principal everyone comes under the group college"
      const inDept = ['Faculty', 'HOD'];
      const targetGroup = inDept.includes(rName) ? deptGroup : collegeGroup;

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
    let workflow = await WorkflowConfiguration.findOne({ name: 'University Request Flow', companyId });
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

    // Faculty creates request -> implicit in app, but start node connects to HOD
    addNode('start', 'start', 'Start', undefined, 300, y); y += dy;
    
    // Faculty node to show creation (type approval just so it represents Faculty in the canvas, though Faculty creates it)
    addNode('faculty', 'approval', 'Faculty (Creator)', 'Faculty', 300, y); y += dy;
    addEdge('start', 'faculty');

    addNode('hod', 'approval', 'HOD', 'HOD', 300, y); y += dy;
    addEdge('faculty', 'hod');

    addNode('inst_manager', 'approval', 'Institution Manager', 'Institution Manager', 300, y); y += dy;
    addEdge('hod', 'inst_manager');

    // Split 1: Options node (Institution Manager chooses)
    addNode('split_1', 'options', 'Options (Manager Choice)', undefined, 300, y, ['Accountant', 'SOP Verifier', 'Security']); y += dy;
    addEdge('inst_manager', 'split_1');

    // Parallel options
    addNode('accountant', 'approval', 'Accountant', 'Accountant', 100, y);
    addNode('sop_verifier', 'approval', 'SOP Verifier', 'SOP Verifier', 300, y);
    addNode('security', 'approval', 'Security', 'Security', 500, y);
    y += dy;

    addEdge('split_1', 'accountant', 'Accountant');
    addEdge('split_1', 'sop_verifier', 'SOP Verifier');
    addEdge('split_1', 'security', 'Security');

    addNode('join_1', 'parallel_join', 'Join 1', undefined, 300, y); y += dy;
    addEdge('accountant', 'join_1');
    addEdge('sop_verifier', 'join_1');
    addEdge('security', 'join_1');

    // Manager repeated
    addNode('inst_manager_2', 'approval', 'Institution Manager (Review)', 'Institution Manager', 300, y); y += dy;
    addEdge('join_1', 'inst_manager_2');

    // Split 2: VP Admin & VP Academics
    addNode('split_2', 'parallel_split', 'Parallel Split', undefined, 300, y); y += dy;
    addEdge('inst_manager_2', 'split_2');

    addNode('vp_admin', 'approval', 'VP Admin', 'VP Admin', 200, y);
    addNode('vp_academics', 'approval', 'VP Academics', 'VP Academics', 400, y);
    y += dy;

    addEdge('split_2', 'vp_admin');
    addEdge('split_2', 'vp_academics');

    addNode('join_2', 'parallel_join', 'Join 2', undefined, 300, y); y += dy;
    addEdge('vp_admin', 'join_2');
    addEdge('vp_academics', 'join_2');

    // Principal
    addNode('principal', 'approval', 'Principal', 'Principal', 300, y); y += dy;
    addEdge('join_2', 'principal');

    // Dean
    addNode('dean', 'approval', 'Dean', 'Dean', 300, y); y += dy;
    addEdge('principal', 'dean');

    // Chairman
    addNode('chairman', 'approval', 'Chairman', 'Chairman', 300, y); y += dy;
    addEdge('dean', 'chairman');

    // End
    addNode('end', 'end', 'End', undefined, 300, y);
    addEdge('chairman', 'end');

    workflow = await WorkflowConfiguration.create({
      companyId,
      name: 'University Request Flow',
      description: 'Seed workflow based on University request approval flow',
      version: 1,
      isActive: true,
      nodes,
      edges,
      createdBy: usersMap['Institution Manager']._id
    });

    console.log('Created Workflow Configuration:', workflow.name);

    console.log('\n--- Seed Complete ---');
    console.log('Login Details (Password is password123 for roles, adminPassword123 for admin):');
    console.log('- System Admin: admin@fenma.edu (adminPassword123)');
    for (const rName of roleNames) {
      const email = `${rName.toLowerCase().replace(/ /g, '_')}@fenma.edu`;
      console.log(`- ${rName}: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
}

seedUniversity();
