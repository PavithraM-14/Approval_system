#!/usr/bin/env node

/**
 * Script to convert Role IDs to CustomRole IDs in existing workflows
 * This fixes the validation error when saving workflows
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import Role from '../models/Role.js';
import CustomRole from '../models/CustomRole.js';

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

async function fixWorkflowRoles() {
  try {
    console.log('🔧 Starting workflow role conversion...\n');
    
    await connectDB();
    
    // Get all workflows
    const workflows = await WorkflowConfiguration.find({});
    console.log(`Found ${workflows.length} workflows to process\n`);
    
    for (const workflow of workflows) {
      console.log(`Processing workflow: ${workflow.name} (${workflow._id})`);
      let modified = false;
      
      for (const node of workflow.nodes) {
        if (node.type === 'approval' && node.data?.roleId) {
          const roleId = node.data.roleId;
          
          // Check if it's already a CustomRole
          let customRole = await CustomRole.findById(roleId);
          
          if (!customRole) {
            // Try to find as regular Role
            const sourceRole = await Role.findById(roleId);
            
            if (sourceRole) {
              console.log(`  Converting Role to CustomRole: ${sourceRole.name}`);
              
              // Check if CustomRole already exists for this role name and company
              customRole = await CustomRole.findOne({
                name: sourceRole.name,
                companyId: workflow.companyId
              });
              
              if (!customRole) {
                // Create CustomRole from regular Role
                customRole = await CustomRole.create({
                  name: sourceRole.name,
                  description: sourceRole.description || `Custom role for ${sourceRole.name}`,
                  companyId: workflow.companyId,
                  permissions: sourceRole.permissions,
                  sourceRoleId: roleId
                });
                
                console.log(`    ✓ Created CustomRole: ${customRole._id}`);
              } else {
                console.log(`    → CustomRole already exists: ${customRole._id}`);
              }
              
              // Update node to use CustomRole ID
              node.data.roleId = customRole._id;
              modified = true;
            } else {
              console.log(`    ⚠ Role not found: ${roleId}`);
            }
          } else {
            console.log(`    → Already using CustomRole: ${customRole.name}`);
          }
        }
      }
      
      if (modified) {
        await workflow.save();
        console.log(`  ✓ Workflow updated\n`);
      } else {
        console.log(`  → No changes needed\n`);
      }
    }
    
    console.log('🎉 Workflow role conversion completed successfully!');
    
  } catch (error) {
    console.error('✗ Workflow role conversion failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the script
fixWorkflowRoles();

export { fixWorkflowRoles };
