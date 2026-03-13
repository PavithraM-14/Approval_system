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

async function checkCEOVisibility() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Find CEO role
    const ceoRole = await CustomRole.findOne({ name: 'CEO' });
    if (!ceoRole) {
      console.error('CEO role not found');
      return;
    }
    console.log('CEO Role ID:', ceoRole._id);

    // Find CEO user
    const ceoAssignment = await UserRoleAssignment.findOne({ roleId: ceoRole._id });
    if (!ceoAssignment) {
      console.error('No user assigned to CEO role');
      return;
    }

    const ceoUser = await User.findById(ceoAssignment.userId).populate('role');
    if (!ceoUser) {
      console.error('CEO user not found');
      return;
    }

    console.log('\n=== CEO User ===');
    console.log('Name:', ceoUser.name);
    console.log('Email:', ceoUser.email);
    console.log('Role:', (ceoUser.role as any)?.name);

    // Find the request
    const request = await Request.findOne({ title: /medium test/i });
    if (!request) {
      console.error('\nRequest not found');
      return;
    }

    console.log('\n=== Request ===');
    console.log('Title:', request.title);
    console.log('Status:', request.status);
    console.log('Execution ID:', request.workflowExecutionId);

    // Get execution state
    const execution = await ExecutionState.findById(request.workflowExecutionId);
    if (!execution) {
      console.error('Execution not found');
      return;
    }

    console.log('\n=== Execution State ===');
    console.log('Current Node:', execution.currentNodeId);
    console.log('Status:', execution.status);

    // Get workflow
    const workflow = await WorkflowConfiguration.findById(execution.workflowId);
    if (!workflow) {
      console.error('Workflow not found');
      return;
    }

    const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
    console.log('Current Node Label:', currentNode?.label);
    console.log('Current Node Type:', currentNode?.type);
    console.log('Current Node Role ID:', currentNode?.data?.roleId);

    // Check if CEO role matches
    const roleMatches = currentNode?.data?.roleId?.toString() === ceoRole._id.toString();
    console.log('\n=== Visibility Check ===');
    console.log('CEO Role ID:', ceoRole._id.toString());
    console.log('Node Role ID:', currentNode?.data?.roleId?.toString());
    console.log('Role Matches:', roleMatches);

    if (roleMatches) {
      console.log('\n✓ CEO should be able to see this request!');
    } else {
      console.log('\n✗ CEO role does not match the current node role');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCEOVisibility();
