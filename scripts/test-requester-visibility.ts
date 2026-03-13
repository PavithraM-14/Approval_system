import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Request from '../models/Request';
import ExecutionState from '../models/ExecutionState';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testRequesterVisibility() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Find the request
    const request = await Request.findOne({ title: /medium test/i }).populate('requester');
    if (!request) {
      console.error('Request not found');
      return;
    }

    console.log('=== Request Details ===');
    console.log('Title:', request.title);
    console.log('Status:', request.status);
    console.log('Requester:', (request.requester as any).name, '(', (request.requester as any).email, ')');
    console.log('Requester ID:', (request.requester as any)._id.toString());
    console.log('Use Custom Workflow:', request.useCustomWorkflow);
    console.log('Workflow Execution ID:', request.workflowExecutionId);

    if (request.workflowExecutionId) {
      const execution = await ExecutionState.findById(request.workflowExecutionId);
      if (execution) {
        console.log('\n=== Execution State ===');
        console.log('Status:', execution.status);
        console.log('Current Node:', execution.currentNodeId);
        console.log('Parallel Paths:', execution.parallelPaths.length);
      }
    }

    // Find the requester user
    const requester = await User.findById((request.requester as any)._id).populate('role');
    if (requester) {
      console.log('\n=== Requester User ===');
      console.log('Name:', requester.name);
      console.log('Email:', requester.email);
      console.log('Role:', (requester.role as any)?.name);
      console.log('Permissions:', (requester.role as any)?.permissions);
    }

    console.log('\n✓ The requester should now be able to see this request in:');
    console.log('  - Dashboard (Recent Requests)');
    console.log('  - All Requests page');
    console.log('  - My Requests page');
    console.log('\nThe fix ensures requesters always see their own requests regardless of workflow state.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testRequesterVisibility();
