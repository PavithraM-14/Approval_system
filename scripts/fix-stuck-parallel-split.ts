import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { WorkflowExecutionEngine } from '../lib/workflow-execution-engine';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixStuckParallelSplit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Find executions stuck at parallel_split with no parallel paths
    const executions = await ExecutionState.find({
      status: 'in_progress',
      parallelPaths: { $size: 0 }
    });

    console.log(`Found ${executions.length} execution(s) to check\n`);

    for (const execution of executions) {
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) {
        console.log(`Workflow not found for execution ${execution._id}`);
        continue;
      }

      const currentNode = workflow.nodes.find(n => n.id === execution.currentNodeId);
      if (!currentNode) {
        console.log(`Current node not found for execution ${execution._id}`);
        continue;
      }

      if (currentNode.type === 'parallel_split') {
        console.log(`Fixing execution ${execution._id}`);
        console.log(`  Current Node: ${currentNode.label} (${currentNode.id})`);
        console.log(`  Creating parallel paths...`);

        const engine = new WorkflowExecutionEngine();
        const updatedExecution = await engine.createParallelPaths(
          execution._id.toString(),
          currentNode.id
        );

        console.log(`  ✓ Created ${updatedExecution.parallelPaths.length} parallel paths`);
        updatedExecution.parallelPaths.forEach((path, idx) => {
          const pathNode = workflow.nodes.find(n => n.id === path.currentNodeId);
          console.log(`    Path ${idx + 1}: ${pathNode?.label || path.currentNodeId}`);
        });
        console.log();
      }
    }

    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixStuckParallelSplit();
