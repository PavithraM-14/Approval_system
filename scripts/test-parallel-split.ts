import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Request from '../models/Request';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testParallelSplit() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Find the Medium Approval Workflow
    const workflow = await WorkflowConfiguration.findOne({ name: 'Medium Approval Workflow' });
    if (!workflow) {
      console.error('Medium Approval Workflow not found');
      return;
    }
    console.log('Found workflow:', workflow.name);

    // Find a request using this workflow
    const request = await Request.findOne({ 
      workflowId: workflow._id 
    }).populate('workflowExecutionId');
    
    if (!request) {
      console.error('No request found for this workflow');
      return;
    }
    console.log('Found request:', request.title);

    // Get the execution state
    const execution = await ExecutionState.findById(request.workflowExecutionId);
    if (!execution) {
      console.error('Execution state not found');
      return;
    }

    console.log('\n=== Execution State ===');
    console.log('Status:', execution.status);
    console.log('Current Node ID:', execution.currentNodeId);
    
    // Find current node details
    const currentNode = workflow.nodes.find(n => n.id === execution.currentNodeId);
    if (currentNode) {
      console.log('Current Node Type:', currentNode.type);
      console.log('Current Node Label:', currentNode.label);
    }

    console.log('\n=== Parallel Paths ===');
    console.log('Number of parallel paths:', execution.parallelPaths.length);
    
    if (execution.parallelPaths.length > 0) {
      execution.parallelPaths.forEach((path, idx) => {
        console.log(`\nPath ${idx + 1}:`);
        console.log('  Path ID:', path.pathId);
        console.log('  Split Node ID:', path.splitNodeId);
        console.log('  Join Node ID:', path.joinNodeId);
        console.log('  Current Node ID:', path.currentNodeId);
        console.log('  Status:', path.status);
        
        const pathNode = workflow.nodes.find(n => n.id === path.currentNodeId);
        if (pathNode) {
          console.log('  Node Type:', pathNode.type);
          console.log('  Node Label:', pathNode.label);
        }
      });
    } else {
      console.log('No parallel paths created yet');
      
      // Check if current node is parallel_split
      if (currentNode && currentNode.type === 'parallel_split') {
        console.log('\n⚠️  Current node is parallel_split but no parallel paths exist!');
        console.log('This indicates the parallel split was not processed correctly.');
      }
    }

    console.log('\n=== History (last 10 entries) ===');
    const recentHistory = execution.history.slice(-10);
    recentHistory.forEach((entry, idx) => {
      const node = workflow.nodes.find(n => n.id === entry.nodeId);
      console.log(`${idx + 1}. ${entry.action} - ${node?.label || entry.nodeId} (${node?.type || 'unknown'}) at ${entry.timestamp}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testParallelSplit();
