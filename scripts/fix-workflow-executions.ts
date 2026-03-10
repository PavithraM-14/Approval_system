import mongoose from 'mongoose';
import ExecutionState from '../models/ExecutionState';
import WorkflowConfiguration from '../models/WorkflowConfiguration';

async function fixWorkflowExecutions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
    console.log('Connected to MongoDB');

    // Find all executions (not just in-progress)
    const executions = await ExecutionState.find({});
    console.log(`Found ${executions.length} total executions`);

    // Also check the specific execution from the logs
    const specificExecution = await ExecutionState.findById('69b062ba66da97b7d53a62d5');
    if (specificExecution) {
      console.log('\nSpecific execution found:');
      console.log(`- ID: ${specificExecution._id}`);
      console.log(`- Request ID: ${specificExecution.requestId}`);
      console.log(`- Status: ${specificExecution.status}`);
      console.log(`- Current Node: ${specificExecution.currentNodeId}`);
      console.log(`- Workflow ID: ${specificExecution.workflowId}`);
    } else {
      console.log('\nSpecific execution not found');
    }

    for (const execution of executions) {
      console.log(`\nProcessing execution ${execution._id}:`);
      console.log(`- Request ID: ${execution.requestId}`);
      console.log(`- Status: ${execution.status}`);
      console.log(`- Current Node: ${execution.currentNodeId}`);

      // Skip if not in progress
      if (execution.status !== 'in_progress') {
        console.log(`- Status is ${execution.status}, skipping`);
        continue;
      }

      // Get the workflow configuration
      const workflow = await WorkflowConfiguration.findById(execution.workflowId);
      if (!workflow) {
        console.log(`- Workflow not found, skipping`);
        continue;
      }

      // Find the current node
      const currentNode = workflow.nodes.find((n: any) => n.id === execution.currentNodeId);
      if (!currentNode) {
        console.log(`- Current node not found, skipping`);
        continue;
      }

      console.log(`- Current Node Label: ${currentNode.label}`);
      console.log(`- Current Node Type: ${currentNode.type}`);

      // Check if current node is a requester node
      if (currentNode.type === 'approval') {
        const nodeLabel = currentNode.label || '';
        const isRequesterNode = nodeLabel.toLowerCase().includes('employee') || 
                               nodeLabel.toLowerCase().includes('emplyee') ||
                               nodeLabel.toLowerCase().includes('requester') ||
                               nodeLabel.toLowerCase().includes('creator');

        if (isRequesterNode) {
          console.log(`- Found requester node, attempting to advance...`);

          // Find the next node
          const nextEdge = workflow.edges.find((e: any) => e.source === currentNode.id);
          if (!nextEdge) {
            console.log(`- No outgoing edge found, skipping`);
            continue;
          }

          const nextNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
          if (!nextNode) {
            console.log(`- Next node not found, skipping`);
            continue;
          }

          console.log(`- Advancing to: ${nextNode.label} (${nextNode.type})`);

          // Update the execution state
          execution.currentNodeId = nextNode.id;
          execution.history.push({
            nodeId: nextNode.id,
            nodeType: nextNode.type,
            action: 'entered',
            timestamp: new Date(),
          });

          await execution.save();
          console.log(`- ✅ Successfully advanced execution`);
        } else {
          console.log(`- Not a requester node, no action needed`);
        }
      } else {
        console.log(`- Not an approval node, no action needed`);
      }
    }

    console.log('\n✅ Workflow execution fix completed');
  } catch (error) {
    console.error('❌ Error fixing workflow executions:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixWorkflowExecutions();
}

export default fixWorkflowExecutions;