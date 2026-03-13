import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Request from '../models/Request';
import WorkflowConfiguration from '../models/WorkflowConfiguration';
import ExecutionState from '../models/ExecutionState';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const workflows = await WorkflowConfiguration.find({});
    console.log('=== Available Workflows ===');
    workflows.forEach(w => {
      console.log(`- ${w.name} (ID: ${w._id}, Active: ${w.isActive})`);
    });

    const requests = await Request.find({}).populate('workflowExecutionId');
    console.log(`\n=== Requests (${requests.length}) ===`);
    
    for (const req of requests) {
      console.log(`\nRequest: ${req.title}`);
      console.log(`  ID: ${req._id}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Execution ID: ${req.workflowExecutionId}`);
      
      if (req.workflowExecutionId) {
        const execution = await ExecutionState.findById(req.workflowExecutionId);
        if (execution) {
          const workflow = await WorkflowConfiguration.findById(execution.workflowId);
          console.log(`  Workflow: ${workflow?.name || 'N/A'}`);
          console.log(`  Execution Status: ${execution.status}`);
          console.log(`  Current Node: ${execution.currentNodeId}`);
          console.log(`  Parallel Paths: ${execution.parallelPaths.length}`);
          
          if (workflow) {
            const currentNode = workflow.nodes.find(n => n.id === execution.currentNodeId);
            if (currentNode) {
              console.log(`  Current Node Type: ${currentNode.type}`);
              console.log(`  Current Node Label: ${currentNode.label}`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkRequests();
