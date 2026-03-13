import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function addEmployeeToHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const executions = await ExecutionState.find({ status: 'in_progress' });
    
    for (const execution of executions) {
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) continue;

      // Find the Employee node
      const employeeNode = workflow.nodes.find((n: any) => {
        const label = n.label?.toLowerCase() || '';
        return n.type === 'approval' && label.includes('employee');
      });

      if (!employeeNode) {
        console.log(`No employee node found in workflow ${workflow.name}`);
        continue;
      }

      // Check if Employee node is already in history
      const hasEmployeeInHistory = execution.history.some((h: any) => h.nodeId === employeeNode.id);
      
      if (hasEmployeeInHistory) {
        console.log(`✓ Execution ${execution._id} already has Employee in history`);
        continue;
      }

      console.log(`Adding Employee node to execution ${execution._id}`);
      
      // Find the Start node entry
      const startIndex = execution.history.findIndex((h: any) => h.nodeType === 'start');
      
      if (startIndex !== -1) {
        const startTimestamp = execution.history[startIndex].timestamp;
        
        // Insert Employee entries right after Start
        execution.history.splice(startIndex + 1, 0, 
          {
            nodeId: employeeNode.id,
            nodeType: employeeNode.type,
            action: 'entered',
            timestamp: startTimestamp,
          } as any,
          {
            nodeId: employeeNode.id,
            nodeType: employeeNode.type,
            action: 'approved',
            timestamp: startTimestamp,
          } as any
        );

        await execution.save();
        console.log(`  ✓ Added Employee node to history\n`);
      }
    }

    console.log('✅ Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addEmployeeToHistory();
