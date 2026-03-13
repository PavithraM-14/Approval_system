#!/usr/bin/env node

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import CustomRole from '../models/CustomRole.js';
import UserRoleAssignment from '../models/UserRoleAssignment.js';

async function activateWorkflow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✓ Connected to MongoDB\n');
    
    const workflow = await WorkflowConfiguration.findOne({ name: 'Medium Approval Workflow' });
    
    if (!workflow) {
      console.log('Workflow not found');
      return;
    }
    
    console.log(`Found workflow: ${workflow.name}`);
    console.log(`Company ID: ${workflow.companyId}\n`);
    
    // Get all users in the company
    const users = await User.find({ company: workflow.companyId }).populate('role');
    console.log(`Found ${users.length} users in company\n`);
    
    // For each user, ensure they have a CustomRole and UserRoleAssignment
    for (const user of users) {
      if (!user.role) {
        console.log(`⚠ User ${user.name} has no role`);
        continue;
      }
      
      const userRoleName = user.role.name;
      const userRoleId = user.role._id;
      
      console.log(`Processing: ${user.name} (${userRoleName})`);
      
      // Check if CustomRole exists for this role
      let customRole = await CustomRole.findOne({
        companyId: workflow.companyId,
        name: userRoleName
      });
      
      // If not, create it
      if (!customRole) {
        console.log(`  Creating CustomRole for: ${userRoleName}`);
        
        customRole = await CustomRole.create({
          name: userRoleName,
          description: `Custom role for ${userRoleName}`,
          companyId: workflow.companyId,
          permissions: user.role.permissions,
          sourceRoleId: userRoleId
        });
        
        console.log(`  ✓ Created CustomRole: ${customRole._id}`);
      } else {
        console.log(`  → CustomRole exists: ${customRole._id}`);
      }
      
      // Check if UserRoleAssignment exists
      const existingAssignment = await UserRoleAssignment.findOne({
        userId: user._id,
        roleId: customRole._id,
        companyId: workflow.companyId
      });
      
      if (!existingAssignment) {
        const newAssignment = await UserRoleAssignment.create({
          userId: user._id,
          roleId: customRole._id,
          companyId: workflow.companyId
        });
        
        console.log(`  ✓ Created UserRoleAssignment: ${newAssignment._id}`);
      } else {
        console.log(`  → UserRoleAssignment exists`);
      }
      
      console.log('');
    }
    
    // Activate the workflow
    workflow.isActive = true;
    await workflow.save();
    console.log('✓ Workflow activated\n');
    
    console.log('🎉 Workflow activation completed successfully!');
    
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

activateWorkflow();
