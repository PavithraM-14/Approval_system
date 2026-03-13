import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import WorkflowConfiguration from '../models/WorkflowConfiguration';
import CustomRole from '../models/CustomRole';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkWorkflowRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const workflow = await WorkflowConfiguration.findOne({ name: 'Medium Approval Workflow' });
    if (!workflow) {
      console.error('Workflow not found');
      return;
    }

    console.log('=== Workflow Nodes with Roles ===\n');

    for (const node of workflow.nodes) {
      if (node.type === 'approval' && node.data?.roleId) {
        console.log(`Node: ${node.label}`);
        console.log(`  Node ID: ${node.id}`);
        console.log(`  Role ID: ${node.data.roleId}`);
        
        // Try to find this role in CustomRole
        const customRole = await CustomRole.findById(node.data.roleId);
        if (customRole) {
          console.log(`  ✓ Found in CustomRole: ${customRole.name}`);
        } else {
          console.log(`  ✗ NOT found in CustomRole`);
        }
        console.log();
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkWorkflowRoles();
