#!/usr/bin/env node

/**
 * Single Workflow Testing Script
 * Usage: tsx scripts/test-single-workflow.ts <workflow-name>
 * Example: tsx scripts/test-single-workflow.ts small
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models
import User from '../models/User.js';
import CustomRole from '../models/CustomRole.js';
import UserRoleAssignment from '../models/UserRoleAssignment.js';
import Request from '../models/Request.js';
import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import ExecutionState from '../models/ExecutionState.js';
import Company from '../models/Company.js';

const workflowConfigs: Record<string, { name: string; companyName: string }> = {
  small: { name: 'Small', companyName: 'Default Company' },
  medium: { name: 'Medium', companyName: 'Medium Corp' },
  large: { name: 'Large', companyName: 'Global Enterprise' },
  university: { name: 'University', companyName: 'SRM Ramapuram' },
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testWorkflow(workflowType: string) {
  const config = workflowConfigs[workflowType];
  if (!config) {
    console.error(`Unknown workflow type: ${workflowType}`);
    console.error(`Available types: ${Object.keys(workflowConfigs).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${config.name.toUpperCase()} Workflow`);
  console.log('='.repeat(70));

  try {
    // Find company
    const company = await Company.findOne({ name: config.companyName });
    if (!company) {
      console.error(`❌ Company not found: ${config.companyName}`);
      console.error('   Please run the seed script first!');
      process.exit(1);
    }
    console.log(`✓ Found company: ${company.name}`);

    // Find workflow
    const workflow = await WorkflowConfiguration.findOne({ 
      companyId: company._id,
      isActive: true 
    });
    if (!workflow) {
      console.error('❌ No active workflow found');
      console.error('   Please run the seed script first!');
      process.exit(1);
    }
    console.log(`✓ Found active workflow: ${workflow.name}`);

    // Get all users with their roles
    const users = await User.find({ company: company._id });
    const userRoles = new Map();
    
    for (const user of users) {
      const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
      if (roleAssignment) {
        const role = await CustomRole.findById(roleAssignment.roleId);
        if (role) {
          userRoles.set(user._id.toString(), {
            user,
            role,
            assignment: roleAssignment
          });
        }
      }
    }
    console.log(`✓ Found ${userRoles.size} users with role assignments\n`);

    // Display all users and their roles
    console.log('Users in workflow:');
    for (const [userId, data] of userRoles) {
      const permissions = [];
      if (data.role?.permissions?.canCreate) permissions.push('create');
      if (data.role?.permissions?.canForward) permissions.push('forward');
      if (data.role?.permissions?.canApprove) permissions.push('approve');
      console.log(`  • ${data.user.name} (${data.role.name}) - ${permissions.join(', ') || 'no permissions'}`);
    }

    // Find requester
    let requester = null;
    let requesterRole = null;
    for (const [userId, data] of userRoles) {
      if (data.role?.permissions?.canCreate) {
        requester = data.user;
        requesterRole = data.role;
        break;
      }
    }

    if (!requester) {
      console.error('\n❌ No requester found (user with canCreate permission)');
      process.exit(1);
    }
    console.log(`\n✓ Requester: ${requester.name} (${requesterRole.name})`);

    // Create request
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 1: Creating Request');
    console.log('-'.repeat(70));
    
    const request = await Request.create({
      requestId: String(Math.floor(100000 + Math.random() * 900000)),
      title: `Test Request - ${config.name} Workflow`,
      purpose: 'Automated test to verify workflow functionality',
      description: 'This is an automated test request',
      requester: requester._id,
      requesterId: requester._id,
      companyId: company._id,
      status: 'submitted',
      attachments: ['test-document.pdf'],
      useCustomWorkflow: true,
      workflowId: workflow._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✓ Created request: ${request._id}`);

    // Initialize workflow execution
    const { WorkflowExecutionEngine } = await import('../lib/workflow-execution-engine.js');
    const engine = new WorkflowExecutionEngine();
    
    const execution = await engine.initializeExecution(
      request._id.toString(),
      workflow._id.toString(),
      company._id.toString(),
      requester._id.toString()
    );
    request.workflowExecutionId = execution._id;
    await request.save();
    console.log(`✓ Initialized workflow execution`);

    // Check current node
    let executionState = await ExecutionState.findById(execution._id);
    let currentNode = workflow.nodes.find(n => n.id === executionState?.currentNodeId);
    console.log(`✓ Request at: ${currentNode?.data?.label || currentNode?.type || 'unknown'}`);

    // Forward through workflow
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 2: Forwarding Through Workflow');
    console.log('-'.repeat(70));
    
    let stepNumber = 1;
    let forwardCount = 0;
    const maxForwards = 25;
    
    while (forwardCount < maxForwards) {
      executionState = await ExecutionState.findById(execution._id);
      if (!executionState) {
        console.error('❌ Execution state not found');
        break;
      }

      currentNode = workflow.nodes.find(n => n.id === executionState.currentNodeId);
      if (!currentNode) {
        console.error('❌ Current node not found');
        break;
      }
      
      // Check if we've reached the end
      if (currentNode.type === 'end') {
        console.log(`\n✅ Reached END node after ${forwardCount} steps`);
        break;
      }

      // Handle approval nodes
      if (currentNode.type === 'approval') {
        const roleId = currentNode.data?.roleId;
        if (!roleId) {
          console.error(`❌ No roleId in approval node: ${currentNode.data?.label}`);
          break;
        }

        const assignment = await UserRoleAssignment.findOne({ roleId });
        if (!assignment) {
          console.error(`❌ No user found for role at: ${currentNode.data?.label}`);
          break;
        }

        const user = await User.findById(assignment.userId);
        const role = await CustomRole.findById(roleId);
        
        if (!user || !role) {
          console.error('❌ User or role not found');
          break;
        }

        const action = role.permissions.canApprove ? 'approved' : 'forward';
        console.log(`\nStep ${stepNumber}: ${user.name} (${role.name})`);
        console.log(`  Action: ${action}`);
        
        try {
          await engine.processAction(user._id.toString(), action, `Test ${action}`);
          console.log(`  ✓ Success`);
          forwardCount++;
          stepNumber++;
        } catch (error: any) {
          console.error(`  ❌ Error: ${error.message}`);
          break;
        }
      } 
      // Handle parallel splits
      else if (currentNode.type === 'parallel_split') {
        console.log(`\nStep ${stepNumber}: Parallel Split`);
        try {
          await engine.createParallelPaths();
          console.log(`  ✓ Created parallel paths`);
          forwardCount++;
          
          // Get updated execution state
          executionState = await ExecutionState.findById(execution._id);
          const parallelPaths = executionState?.parallelPaths || [];
          
          console.log(`  Processing ${parallelPaths.length} parallel paths:`);
          
          for (let i = 0; i < parallelPaths.length; i++) {
            const path = parallelPaths[i];
            const pathNode = workflow.nodes.find(n => n.id === path.currentNodeId);
            
            if (pathNode && pathNode.type === 'approval' && pathNode.data?.roleId) {
              const assignment = await UserRoleAssignment.findOne({ roleId: pathNode.data.roleId });
              if (assignment) {
                const user = await User.findById(assignment.userId);
                const role = await CustomRole.findById(pathNode.data.roleId);
                
                if (user && role) {
                  const action = role.permissions.canApprove ? 'approved' : 'forward';
                  console.log(`    Path ${i + 1}: ${user.name} (${role.name}) - ${action}`);
                  
                  try {
                    await engine.processAction(user._id.toString(), action, `Test parallel ${action}`);
                    console.log(`      ✓ Success`);
                  } catch (error: any) {
                    console.error(`      ❌ Error: ${error.message}`);
                  }
                }
              }
            }
          }
          stepNumber++;
        } catch (error: any) {
          console.error(`  ❌ Error: ${error.message}`);
          break;
        }
      }
      // Handle option nodes
      else if (currentNode.type === 'option') {
        console.log(`\nStep ${stepNumber}: Option Node - Choosing first option`);
        const edges = workflow.edges.filter(e => e.source === executionState.currentNodeId);
        
        if (edges.length > 0) {
          const firstOption = edges[0];
          const targetNode = workflow.nodes.find(n => n.id === firstOption.target);
          
          if (targetNode && targetNode.type === 'approval' && targetNode.data?.roleId) {
            const assignment = await UserRoleAssignment.findOne({ roleId: targetNode.data.roleId });
            if (assignment) {
              const user = await User.findById(assignment.userId);
              const role = await CustomRole.findById(targetNode.data.roleId);
              
              if (user && role) {
                const action = role.permissions.canApprove ? 'approved' : 'forward';
                console.log(`  Chosen: ${user.name} (${role.name}) - ${action}`);
                
                try {
                  await engine.processAction(user._id.toString(), action, `Test option ${action}`);
                  console.log(`  ✓ Success`);
                  forwardCount++;
                  stepNumber++;
                } catch (error: any) {
                  console.error(`  ❌ Error: ${error.message}`);
                  break;
                }
              }
            }
          }
        }
      } else {
        console.log(`\nUnhandled node type: ${currentNode.type}`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (forwardCount >= maxForwards) {
      console.error('\n❌ Maximum forwards reached - possible infinite loop');
    }

    // Check final status
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 3: Final Status');
    console.log('-'.repeat(70));
    
    const finalRequest = await Request.findById(request._id);
    const finalExecution = await ExecutionState.findById(execution._id);
    
    if (finalRequest && finalExecution) {
      const finalNode = workflow.nodes.find(n => n.id === finalExecution.currentNodeId);
      console.log(`Final node: ${finalNode?.type || 'unknown'}`);
      console.log(`Request status: ${finalRequest.status}`);
      console.log(`Total steps: ${forwardCount}`);
      
      if (finalNode?.type === 'end' && finalRequest.status === 'approved') {
        console.log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      } else if (finalNode?.type === 'end') {
        console.log('\n✅ Workflow reached end node');
      } else {
        console.log('\n⚠️  Workflow did not complete');
      }
    }

    // Cleanup
    console.log('\n' + '-'.repeat(70));
    console.log('Cleaning up test data...');
    await Request.findByIdAndDelete(request._id);
    await ExecutionState.findByIdAndDelete(execution._id);
    console.log('✓ Cleanup complete');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function main() {
  const workflowType = process.argv[2];
  
  if (!workflowType) {
    console.error('Usage: tsx scripts/test-single-workflow.ts <workflow-type>');
    console.error('Available types: small, medium, large, university');
    process.exit(1);
  }

  await connectDB();
  await testWorkflow(workflowType.toLowerCase());
  
  console.log('\n' + '='.repeat(70));
  console.log('Test Complete!');
  console.log('='.repeat(70) + '\n');
  
  await mongoose.disconnect();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
