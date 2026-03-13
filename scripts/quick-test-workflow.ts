#!/usr/bin/env node

/**
 * Quick Workflow Test - Just verifies setup is correct
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import User from '../models/User.js';
import CustomRole from '../models/CustomRole.js';
import UserRoleAssignment from '../models/UserRoleAssignment.js';
import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import Company from '../models/Company.js';

const workflowConfigs: Record<string, string> = {
  small: 'Default Company',
  medium: 'Default Company',
  large: 'Global Enterprise Solutions',
  university: 'Fenma University',
};

async function testWorkflow(workflowType: string) {
  const companyName = workflowConfigs[workflowType];
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${workflowType.toUpperCase()} Workflow Setup`);
  console.log('='.repeat(70));

  // Find company
  const company = await Company.findOne({ name: companyName });
  if (!company) {
    console.error(`❌ Company not found: ${companyName}`);
    return false;
  }
  console.log(`✓ Company: ${company.name}`);

  // Find workflow
  const workflow = await WorkflowConfiguration.findOne({ 
    companyId: company._id,
    isActive: true 
  });
  if (!workflow) {
    console.error('❌ No active workflow found');
    return false;
  }
  console.log(`✓ Workflow: ${workflow.name}`);
  console.log(`  Nodes: ${workflow.nodes.length}`);
  console.log(`  Edges: ${workflow.edges.length}`);

  // Get all users with roles
  const users = await User.find({ company: company._id });
  console.log(`✓ Users: ${users.length}`);

  const roleStats: Record<string, number> = {};
  let hasRequester = false;
  let hasForwarder = false;
  let hasApprover = false;

  for (const user of users) {
    const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
    if (roleAssignment) {
      const role = await CustomRole.findById(roleAssignment.roleId);
      if (role) {
        roleStats[role.name] = (roleStats[role.name] || 0) + 1;
        
        if (role.permissions?.canCreate) hasRequester = true;
        if (role.permissions?.canForward) hasForwarder = true;
        if (role.permissions?.canApprove) hasApprover = true;
      }
    }
  }

  console.log('\nRole Distribution:');
  for (const [roleName, count] of Object.entries(roleStats)) {
    console.log(`  • ${roleName}: ${count} user(s)`);
  }

  console.log('\nWorkflow Capabilities:');
  console.log(`  ${hasRequester ? '✓' : '❌'} Has requester (canCreate)`);
  console.log(`  ${hasForwarder ? '✓' : '❌'} Has forwarder (canForward)`);
  console.log(`  ${hasApprover ? '✓' : '❌'} Has approver (canApprove)`);

  const allGood = hasRequester && hasForwarder && hasApprover;
  console.log(`\n${allGood ? '✅ Workflow setup is COMPLETE' : '⚠️  Workflow setup has issues'}`);
  
  return allGood;
}

async function main() {
  const workflowType = process.argv[2];
  
  if (!workflowType) {
    console.error('Usage: tsx scripts/quick-test-workflow.ts <workflow-type>');
    console.error('Available types: small, medium, large, university');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
  console.log('✓ Connected to MongoDB');

  const success = await testWorkflow(workflowType.toLowerCase());
  
  await mongoose.disconnect();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
