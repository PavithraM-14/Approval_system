import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixEmployeeNodeStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Find all in-progress executions
    const executions = await ExecutionState.find({ status: 'in_progress' });
    console.log(`Found ${executions.length} in-progress execution(s)\n`);

    for (const execution of executions) {
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) {
        console.log(`Workflow not found for execution ${execution._id}`);
        continue;
      }

      // Find the Employee node (or any requester node)
      const employeeNode = workflow.nodes.find((n: any) => {
        const label = n.label?.toLowerCase() || '';
        return n.type === 'approval' && (
          label.includes('employee') || 
          label.includes('requester') || 
          label.includes('creator')
        );
      });

      if (!employeeNode) {
        console.log(`No employee/requester node found in workflow ${workflow.name}`);
        continue;
      }

      // Check if there's already a forwarded action for this node
      const hasForwardedAction = execution.history.some((h: any) => 
        h.nodeId === employeeNode.id && h.action === 'forwarded'
      );

      if (hasForwardedAction) {
        console.log(`✓ Execution ${execution._id} already has forwarded action for ${employeeNode.label}`);
        continue;
      }

      // Check if the workflow has moved past the employee node
      const hasEnteredAction = execution.history.some((h: any) => 
        h.nodeId === employeeNode.id && h.action === 'entered'
      );

      if (!hasEnteredAction) {
        console.log(`  Execution ${execution._id} hasn't entered ${employeeNode.label} yet`);
        continue;
      }

      // Add the forwarded action
      console.log(`Fixing execution ${execution._id} - adding forwarded action for ${employeeNode.label}`);
      
      // Find the index where we should insert the forwarded action
      // It should be right after the 'entered' action for the employee node
      const enteredIndex = execution.history.findIndex((h: any) => 
        h.nodeId === employeeNode.id && h.action === 'entered'
      );

      if (enteredIndex !== -1) {
        execution.history.splice(enteredIndex + 1, 0, {
          nodeId: employeeNode.id,
          nodeType: employeeNode.type,
          action: 'forwarded',
          timestamp: execution.history[enteredIndex].timestamp,
        } as any);

        await execution.save();
        console.log(`  ✓ Added forwarded action for ${employeeNode.label}\n`);
      }
    }

    console.log('✅ Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixEmployeeNodeStatus();
