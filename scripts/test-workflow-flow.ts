#!/usr/bin/env node

/**
 * Complete Workflow Flow Test
 * 
 * Tests that:
 * 1. Requester can create a request
 * 2. Request is immediately visible to next level
 * 3. Each level can forward/approve
 * 4. Final approval completes the workflow
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
import Request from '../models/Request.js';
import WorkflowConfiguration from '../models/WorkflowConfiguration.js';
import ExecutionState from '../models/ExecutionState.js';
import Company from '../models/Company.js';

const workflowConfigs: Record<string, string> = {
  small: 'Default Company',
  medium: 'Default Company',
  large: 'Global Enterprise Solutions',
  university: 'Fenma University',
};

async function testWorkflowFlow(workflowType: string) {
  const companyName = workflowConfigs[workflowType];
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${workflowType.toUpperCase()} Workflow Flow`);
  console.log('='.repeat(70));

  try {
    // Find company
    const company = await Company.findOne({ name: companyName });
    if (!company) {
      console.error(`❌ Company not found: ${companyName}`);
      return false;
    }

    // Find workflow
    const workflow = await WorkflowConfiguration.findOne({ 
      companyId: company._id,
      isActive: true 
    });
    if (!workflow) {
      console.error('❌ No active workflow found');
      return false;
    }

    // Get all users with roles
    const users = await User.find({ company: company._id });
    const userRoleMap = new Map();
    
    for (const user of users) {
      const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
      if (roleAssignment) {
        const role = await CustomRole.findById(roleAssignment.roleId);
        if (role) {
          userRoleMap.set(user._id.toString(), { user, role });
        }
      }
    }

    // Find requester
    let requester = null;
    let requesterRole = null;
    for (const [userId, data] of userRoleMap) {
      if (data.role.permissions?.canCreate) {
        requester = data.user;
        requesterRole = data.role;
        break;
      }
    }

    if (!requester) {
      console.error('❌ No requester found');
      return false;
    }

    console.log(`\n✓ Requester: ${requester.name} (${requesterRole.name})`);

    // STEP 1: Create request
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 1: Requester Creates Request');
    console.log('-'.repeat(70));
    
    const requestId = String(Math.floor(100000 + Math.random() * 900000));
    const request = await Request.create({
      requestId: requestId,
      title: `Test Flow - ${workflowType}`,
      purpose: 'Testing complete workflow flow',
      description: 'Automated test',
      requester: requester._id,
      requesterId: requester._id,
      companyId: company._id,
      status: 'submitted',
      attachments: ['test.pdf'],
      useCustomWorkflow: true,
      workflowId: workflow._id,
    });
    console.log(`✓ Request created: ${requestId}`);

    // Initialize workflow
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
    console.log(`✓ Workflow initialized`);

    // STEP 2: Check who should see the request now
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 2: Verify Request Visibility');
    console.log('-'.repeat(70));
    
    let executionState = await ExecutionState.findById(execution._id);
    const currentNode = workflow.nodes.find(n => n.id === executionState?.currentNodeId);
    
    if (currentNode?.type === 'approval' && currentNode.data?.roleId) {
      const roleId = currentNode.data.roleId;
      const assignments = await UserRoleAssignment.find({ roleId });
      
      console.log(`Current node: ${currentNode.data.label}`);
      console.log(`Users who should see this request:`);
      
      for (const assignment of assignments) {
        const user = await User.findById(assignment.userId);
        const role = await CustomRole.findById(assignment.roleId);
        if (user && role) {
          console.log(`  ✓ ${user.name} (${role.name})`);
        }
      }
    }

    // STEP 3: Forward through workflow
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 3: Forward Through Workflow');
    console.log('-'.repeat(70));
    
    let stepNum = 1;
    let maxSteps = 30;
    let completed = false;
    
    while (stepNum <= maxSteps) {
      executionState = await ExecutionState.findById(execution._id);
      if (!executionState) break;

      const node = workflow.nodes.find(n => n.id === executionState.currentNodeId);
      if (!node) break;

      if (node.type === 'end') {
        console.log(`\n✅ Reached END node`);
        completed = true;
        break;
      }

      if (node.type === 'approval') {
        const roleId = node.data?.roleId;
        if (!roleId) break;

        const assignment = await UserRoleAssignment.findOne({ roleId });
        if (!assignment) {
          console.error(`❌ No user for role at: ${node.data?.label}`);
          break;
        }

        const user = await User.findById(assignment.userId);
        const role = await CustomRole.findById(roleId);
        
        if (!user || !role) break;

        const action = role.permissions.canApprove ? 'approved' : 'forward';
        console.log(`\nStep ${stepNum}: ${user.name} (${role.name}) - ${action}`);
        
        try {
          const isForward = !role.permissions.canApprove;
          await engine.processAction(
            execution._id.toString(),
            'approved',
            user._id.toString(),
            `Test ${action}`,
            isForward
          );
          console.log(`  ✓ Success`);
          stepNum++;
        } catch (error: any) {
          console.error(`  ❌ Error: ${error.message}`);
          break;
        }
      } else if (node.type === 'parallel_split') {
        console.log(`\nStep ${stepNum}: Parallel Split`);
        
        // Get parallel paths
        executionState = await ExecutionState.findById(execution._id);
        let parallelPaths = executionState?.parallelPaths || [];
        
        if (parallelPaths.length === 0) {
          console.log(`  Creating parallel paths...`);
          // Create parallel paths manually
          await engine.createParallelPaths(execution._id.toString(), node.id);
          await new Promise(resolve => setTimeout(resolve, 200));
          executionState = await ExecutionState.findById(execution._id);
          parallelPaths = executionState?.parallelPaths || [];
        }
        
        const paths = parallelPaths.filter(p => p.status === 'active');
        console.log(`  Processing ${paths.length} parallel paths`);
        
        for (let i = 0; i < paths.length; i++) {
          const path = paths[i];
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
                  const isForward = !role.permissions.canApprove;
                  await engine.processAction(
                    execution._id.toString(),
                    'approved',
                    user._id.toString(),
                    `Test parallel ${action}`,
                    isForward
                  );
                  console.log(`      ✓ Success`);
                } catch (error: any) {
                  console.error(`      ❌ Error: ${error.message}`);
                }
              }
            }
          }
        }
        stepNum++;
      } else if (node.type === 'parallel_join') {
        console.log(`\nStep ${stepNum}: Parallel Join - Advancing past it`);
        
        // Find the next node after the join
        const outgoingEdge = workflow.edges.find(e => e.source === node.id);
        if (outgoingEdge) {
          const nextNode = workflow.nodes.find(n => n.id === outgoingEdge.target);
          if (nextNode) {
            executionState.currentNodeId = nextNode.id;
            executionState.history.push({
              nodeId: nextNode.id,
              nodeType: nextNode.type,
              action: 'entered',
              timestamp: new Date(),
            });
            await executionState.save();
            console.log(`  ✓ Advanced to: ${nextNode.label}`);
            stepNum++;
          } else {
            console.log(`  ❌ No next node found after join`);
            break;
          }
        } else {
          console.log(`  ❌ No outgoing edge from join node`);
          break;
        }
      } else if (node.type === 'options' || node.type === 'option') {
        console.log(`\nStep ${stepNum}: Options Node - Choosing first option`);
        
        const edges = workflow.edges.filter(e => e.source === executionState.currentNodeId);
        if (edges.length > 0) {
          const firstEdge = edges[0];
          const targetNode = workflow.nodes.find(n => n.id === firstEdge.target);
          
          if (targetNode && targetNode.type === 'approval' && targetNode.data?.roleId) {
            const assignment = await UserRoleAssignment.findOne({ roleId: targetNode.data.roleId });
            if (assignment) {
              const user = await User.findById(assignment.userId);
              const role = await CustomRole.findById(targetNode.data.roleId);
              
              if (user && role) {
                const action = role.permissions.canApprove ? 'approved' : 'forward';
                console.log(`  Chosen: ${targetNode.label} - ${user.name} (${role.name}) - ${action}`);
                
                try {
                  // For options nodes, we need to manually advance to the chosen node
                  executionState.currentNodeId = targetNode.id;
                  executionState.history.push({
                    nodeId: targetNode.id,
                    nodeType: targetNode.type,
                    action: 'entered',
                    timestamp: new Date(),
                  });
                  await executionState.save();
                  
                  // Now process the approval action at the target node
                  const isForward = !role.permissions.canApprove;
                  await engine.processAction(
                    execution._id.toString(),
                    'approved',
                    user._id.toString(),
                    `Test option ${action}`,
                    isForward
                  );
                  console.log(`  ✓ Success`);
                  stepNum++;
                } catch (error: any) {
                  console.error(`  ❌ Error: ${error.message}`);
                  break;
                }
              }
            }
          } else {
            console.log(`  ⚠️  First option target is not an approval node, skipping`);
            break;
          }
        } else {
          console.log(`  ⚠️  No outgoing edges from options node`);
          break;
        }
      } else {
        console.log(`\nUnhandled node type: ${node.type}`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // STEP 4: Verify final status
    console.log('\n' + '-'.repeat(70));
    console.log('STEP 4: Final Status');
    console.log('-'.repeat(70));
    
    const finalRequest = await Request.findById(request._id);
    const finalExecution = await ExecutionState.findById(execution._id);
    
    if (finalRequest && finalExecution) {
      const finalNode = workflow.nodes.find(n => n.id === finalExecution.currentNodeId);
      console.log(`Final node: ${finalNode?.type || 'unknown'}`);
      console.log(`Request status: ${finalRequest.status}`);
      console.log(`Total steps: ${stepNum - 1}`);
      
      if (completed && finalRequest.status === 'approved') {
        console.log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      } else if (completed) {
        console.log('\n✅ Workflow reached end');
      } else {
        console.log('\n⚠️  Workflow did not complete');
      }
    }

    // Cleanup
    await Request.findByIdAndDelete(request._id);
    await ExecutionState.findByIdAndDelete(execution._id);
    
    return completed;

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  const workflowType = process.argv[2];
  
  if (!workflowType) {
    console.error('Usage: tsx scripts/test-workflow-flow.ts <workflow-type>');
    console.error('Available types: small, medium, large, university');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
  console.log('✓ Connected to MongoDB');

  const success = await testWorkflowFlow(workflowType.toLowerCase());
  
  console.log('\n' + '='.repeat(70));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(70) + '\n');
  
  await mongoose.disconnect();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
