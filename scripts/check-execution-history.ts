import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkExecutionHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const executions = await ExecutionState.find({ status: 'in_progress' });
    
    for (const execution of executions) {
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) continue;

      console.log(`\n=== Execution ${execution._id} ===`);
      console.log(`Workflow: ${workflow.name}`);
      console.log(`Current Node: ${execution.currentNodeId}`);
      
      const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
      console.log(`Current Node Label: ${currentNode?.label || 'Unknown'}`);
      
      console.log('\nHistory:');
      execution.history.forEach((h: any, idx: number) => {
        const node = workflow.nodes.find((n: any) => n.id === h.nodeId);
        console.log(`  ${idx + 1}. ${h.action.padEnd(10)} - ${node?.label || h.nodeId} (${node?.type || 'unknown'})`);
      });

      console.log('\nParallel Paths:', execution.parallelPaths.length);
      execution.parallelPaths.forEach((p: any, idx: number) => {
        const node = workflow.nodes.find((n: any) => n.id === p.currentNodeId);
        console.log(`  Path ${idx + 1}: ${node?.label || p.currentNodeId} - Status: ${p.status}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkExecutionHistory();
