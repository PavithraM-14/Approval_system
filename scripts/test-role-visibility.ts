#!/usr/bin/env node

/**
 * Test Role Visibility
 * 
 * Tests request visibility for all roles across different views:
 * - All Requests (/api/requests)
 * - Dashboard Stats (/api/dashboard/stats)
 * - Pending Approvals (/api/approvals)
 * - My Requests (filtered by requester)
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
import { WorkflowExecutionEngine } from '../lib/workflow-execution-engine.js';

interface RoleTestResult {
  roleName: string;
  userName: string;
  userId: string;
  allRequests: number;
  dashboardStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  pendingApprovals: number;
  myRequests: number;
  canSeeOwnRequests: boolean;
  canSeePendingApprovals: boolean;
  errors: string[];
}

async function testRoleVisibility(workflowType: string): Promise<void> {
  const workflowConfigs: Record<string, string> = {
    small: 'Default Company',
    medium: 'Default Company',
    large: 'Global Enterprise Solutions',
    university: 'Fenma University',
  };

  const companyName = workflowConfigs[workflowType];
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Role Visibility for ${workflowType.toUpperCase()} Workflow`);
  console.log('='.repeat(80));

  try {
    // Find company
    const company = await Company.findOne({ name: companyName });
    if (!company) {
      console.error(`❌ Company not found: ${companyName}`);
      return;
    }

    // Find workflow
    const workflow = await WorkflowConfiguration.findOne({ 
      companyId: company._id,
      isActive: true 
    });
    if (!workflow) {
      console.error('❌ No active workflow found');
      return;
    }

    // Get all users with roles
    const users = await User.find({ company: company._id });
    const results: RoleTestResult[] = [];

    console.log(`\nFound ${users.length} users in company`);

    // Create a test request for each role to test
    console.log('\n' + '-'.repeat(80));
    console.log('Creating Test Requests');
    console.log('-'.repeat(80));

    const testRequests: any[] = [];
    
    // Find a requester (user with canCreate permission, but NOT system admin)
    let requester = null;
    for (const user of users) {
      const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
      if (roleAssignment) {
        const role = await CustomRole.findById(roleAssignment.roleId);
        if (role?.permissions?.canCreate && !role.isSystemAdmin) {
          requester = user;
          console.log(`Using requester: ${user.name} (${role.name})`);
          break;
        }
      }
    }

    if (!requester) {
      console.error('❌ No requester found');
      return;
    }

    // Create 3 test requests at different stages
    const engine = new WorkflowExecutionEngine();
    
    for (let i = 0; i < 3; i++) {
      const requestId = String(Math.floor(100000 + Math.random() * 900000));
      const request = await Request.create({
        requestId: requestId,
        title: `Visibility Test ${i + 1} - ${workflowType}`,
        purpose: `Testing visibility for request ${i + 1}`,
        description: 'Automated visibility test',
        requester: requester._id,
        requesterId: requester._id,
        companyId: company._id,
        status: 'submitted',
        attachments: ['test.pdf'],
        useCustomWorkflow: true,
        workflowId: workflow._id,
      });

      const execution = await engine.initializeExecution(
        request._id.toString(),
        workflow._id.toString(),
        company._id.toString(),
        requester._id.toString()
      );
      
      request.workflowExecutionId = execution._id;
      await request.save();
      
      testRequests.push(request);
      console.log(`✓ Created test request ${i + 1}: ${requestId}`);
    }

    // Advance first request through one approval
    if (testRequests.length > 0) {
      const firstExecution = await ExecutionState.findById(testRequests[0].workflowExecutionId);
      if (firstExecution) {
        const currentNode = workflow.nodes.find(n => n.id === firstExecution.currentNodeId);
        if (currentNode?.type === 'approval' && currentNode.data?.roleId) {
          const assignment = await UserRoleAssignment.findOne({ roleId: currentNode.data.roleId });
          if (assignment) {
            const approver = await User.findById(assignment.userId);
            const role = await CustomRole.findById(currentNode.data.roleId);
            if (approver && role) {
              try {
                const isForward = !role.permissions.canApprove;
                await engine.processAction(
                  firstExecution._id.toString(),
                  'approved',
                  approver._id.toString(),
                  'Test approval',
                  isForward
                );
                console.log(`✓ Advanced request 1 through ${role.name}`);
              } catch (error: any) {
                console.log(`⚠️  Could not advance request 1: ${error.message}`);
              }
            }
          }
        }
      }
    }

    // Test visibility for each role
    console.log('\n' + '-'.repeat(80));
    console.log('Testing Visibility for Each Role');
    console.log('-'.repeat(80));

    for (const user of users) {
      const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id });
      if (!roleAssignment) continue;

      const role = await CustomRole.findById(roleAssignment.roleId);
      if (!role) continue;

      console.log(`\n📋 Testing: ${user.name} (${role.name})`);

      const result: RoleTestResult = {
        roleName: role.name,
        userName: user.name,
        userId: user._id.toString(),
        allRequests: 0,
        dashboardStats: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        },
        pendingApprovals: 0,
        myRequests: 0,
        canSeeOwnRequests: false,
        canSeePendingApprovals: false,
        errors: [],
      };

      try {
        // Test 1: All Requests
        const allRequests = await Request.find({})
          .populate('requester', 'name email')
          .lean();

        // Simulate the filtering logic from /api/requests
        const permissions = {
          ...role.permissions,
          isSystemAdmin: role.isSystemAdmin
        };

        const isOnlyRequester = permissions.canCreate && 
                               !permissions.canView && 
                               !permissions.canForward && 
                               !permissions.canApprove && 
                               !permissions.isSystemAdmin;

        if (isOnlyRequester) {
          // Should only see own requests
          result.allRequests = allRequests.filter(r => 
            r.requester._id?.toString() === user._id.toString() ||
            r.requester.toString() === user._id.toString()
          ).length;
          result.canSeeOwnRequests = result.allRequests > 0;
        } else {
          // Should see requests assigned to them in workflow
          const userRoleIds = [role._id.toString()];
          let visibleCount = 0;

          for (const request of allRequests) {
            if (!request.workflowExecutionId) continue;

            const execution = await ExecutionState.findById(request.workflowExecutionId);
            if (!execution) continue;

            const wf = await WorkflowConfiguration.findById(execution.workflowId);
            if (!wf) continue;

            // Check if user is current approver
            const currentNode = wf.nodes.find(n => n.id === execution.currentNodeId);
            const nodeRoleId = currentNode?.data?.roleId?.toString();
            const isCurrentApprover = currentNode?.type === 'approval' && 
                                     nodeRoleId && 
                                     userRoleIds.includes(nodeRoleId);

            // Check if user has interacted with request
            const hasInteracted = execution.history.some((entry: any) => 
              entry.userId?.toString() === user._id.toString()
            );

            // Check if user is requester
            const isRequester = request.requester._id?.toString() === user._id.toString() ||
                               request.requester.toString() === user._id.toString();

            if (isCurrentApprover || hasInteracted || isRequester) {
              visibleCount++;
            }
          }

          result.allRequests = visibleCount;
          result.canSeeOwnRequests = allRequests.some(r => 
            r.requester._id?.toString() === user._id.toString() ||
            r.requester.toString() === user._id.toString()
          );
        }

        // Test 2: Dashboard Stats
        // For simplicity, use the same logic as all requests
        result.dashboardStats.total = result.allRequests;
        result.dashboardStats.pending = allRequests.filter(r => 
          r.status === 'submitted' || r.status === 'in_progress'
        ).length;
        result.dashboardStats.approved = allRequests.filter(r => 
          r.status === 'approved'
        ).length;
        result.dashboardStats.rejected = allRequests.filter(r => 
          r.status === 'rejected'
        ).length;

        // Test 3: Pending Approvals
        if (!isOnlyRequester) {
          const userRoleIds = [role._id.toString()];
          let pendingCount = 0;

          for (const request of allRequests) {
            if (!request.workflowExecutionId) continue;

            const execution = await ExecutionState.findById(request.workflowExecutionId);
            if (!execution) continue;

            const wf = await WorkflowConfiguration.findById(execution.workflowId);
            if (!wf) continue;

            // Check if user is current approver
            const currentNode = wf.nodes.find(n => n.id === execution.currentNodeId);
            const nodeRoleId = currentNode?.data?.roleId?.toString();
            const isCurrentApprover = currentNode?.type === 'approval' && 
                                     nodeRoleId && 
                                     userRoleIds.includes(nodeRoleId);

            if (isCurrentApprover) {
              pendingCount++;
            }
          }

          result.pendingApprovals = pendingCount;
          result.canSeePendingApprovals = pendingCount > 0;
        }

        // Test 4: My Requests
        result.myRequests = allRequests.filter(r => 
          r.requester._id?.toString() === user._id.toString() ||
          r.requester.toString() === user._id.toString()
        ).length;

        // Print results
        console.log(`  All Requests: ${result.allRequests}`);
        console.log(`  Dashboard Total: ${result.dashboardStats.total}`);
        console.log(`  Pending Approvals: ${result.pendingApprovals}`);
        console.log(`  My Requests: ${result.myRequests}`);
        console.log(`  Can See Own: ${result.canSeeOwnRequests ? '✓' : '✗'}`);
        console.log(`  Can See Pending: ${result.canSeePendingApprovals ? '✓' : '✗'}`);

      } catch (error: any) {
        result.errors.push(error.message);
        console.log(`  ❌ Error: ${error.message}`);
      }

      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const totalRoles = results.length;
    const rolesWithVisibility = results.filter(r => r.allRequests > 0).length;
    const rolesWithPending = results.filter(r => r.pendingApprovals > 0).length;
    const rolesWithErrors = results.filter(r => r.errors.length > 0).length;

    console.log(`\nTotal Roles Tested: ${totalRoles}`);
    console.log(`Roles with Visible Requests: ${rolesWithVisibility}`);
    console.log(`Roles with Pending Approvals: ${rolesWithPending}`);
    console.log(`Roles with Errors: ${rolesWithErrors}`);

    if (rolesWithErrors > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.filter(r => r.errors.length > 0).forEach(r => {
        console.log(`  ${r.roleName}: ${r.errors.join(', ')}`);
      });
    }

    // Cleanup
    console.log('\n' + '-'.repeat(80));
    console.log('Cleaning up test requests...');
    for (const request of testRequests) {
      await Request.findByIdAndDelete(request._id);
      if (request.workflowExecutionId) {
        await ExecutionState.findByIdAndDelete(request.workflowExecutionId);
      }
    }
    console.log('✓ Cleanup complete');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function main() {
  const workflowType = process.argv[2] || 'small';
  
  if (!['small', 'medium', 'large', 'university'].includes(workflowType)) {
    console.error('Usage: tsx scripts/test-role-visibility.ts <workflow-type>');
    console.error('Available types: small, medium, large, university');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
  console.log('✓ Connected to MongoDB');

  await testRoleVisibility(workflowType);
  
  await mongoose.disconnect();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
