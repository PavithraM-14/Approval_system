import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import CustomRole from '../models/CustomRole';
import UserRoleAssignment from '../models/UserRoleAssignment';
import Request from '../models/Request';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkUserRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Find Legal, Finance, and IT roles
    const roles = await CustomRole.find({
      name: { $in: ['Legal', 'Finance', 'IT'] }
    });

    console.log('=== Roles ===');
    roles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role._id})`);
    });
    console.log();

    // For each role, find users and their pending requests
    for (const role of roles) {
      console.log(`\n=== ${role.name} Role ===`);
      
      const assignments = await UserRoleAssignment.find({ roleId: role._id });
      console.log(`Users with this role: ${assignments.length}`);
      
      for (const assignment of assignments) {
        const user = await User.findById(assignment.userId);
        if (!user) continue;
        
        console.log(`\nUser: ${user.name} (${user.email})`);
        
        // Find requests where this user needs to approve
        const executions = await ExecutionState.find({
          status: 'in_progress',
          'parallelPaths.currentNodeId': { $exists: true }
        });

        let pendingCount = 0;
        for (const execution of executions) {
          const workflow = await WorkflowConfiguration.findById(execution.workflowId);
          if (!workflow) continue;

          // Check if any parallel path is waiting for this role
          for (const path of execution.parallelPaths) {
            if (path.status !== 'active') continue;
            
            const node = workflow.nodes.find(n => n.id === path.currentNodeId);
            if (node && node.type === 'approval' && node.data.roleId?.toString() === role._id.toString()) {
              const request = await Request.findOne({ workflowExecutionId: execution._id });
              if (request) {
                console.log(`  ✓ Pending: "${request.title}" (Request ID: ${request._id})`);
                console.log(`    Node: ${node.label}`);
                console.log(`    Path: ${path.pathId}`);
                pendingCount++;
              }
            }
          }
        }
        
        if (pendingCount === 0) {
          console.log('  No pending requests');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserRequests();
