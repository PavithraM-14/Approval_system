#!/usr/bin/env node

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import WorkflowConfiguration from '../models/WorkflowConfiguration.js';

async function checkWorkflow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const wf = await WorkflowConfiguration.findOne({ name: 'Medium Approval Workflow' });
    
    if (!wf) {
      console.log('Workflow not found');
      return;
    }
    
    console.log('Workflow:', wf.name);
    console.log('Nodes:', wf.nodes.length);
    console.log('Edges:', wf.edges.length);
    
    console.log('\nNodes without incoming edges (except start, grouping, subgroup):');
    wf.nodes
      .filter(n => !['start', 'grouping', 'subgroup'].includes(n.type))
      .forEach(n => {
        const hasIncoming = wf.edges.some(e => e.target === n.id);
        if (!hasIncoming) {
          console.log('  -', n.id, n.label, n.type);
        }
      });
    
    console.log('\nNodes without outgoing edges (except end, grouping, subgroup):');
    wf.nodes
      .filter(n => !['end', 'grouping', 'subgroup'].includes(n.type))
      .forEach(n => {
        const hasOutgoing = wf.edges.some(e => e.source === n.id);
        if (!hasOutgoing) {
          console.log('  -', n.id, n.label, n.type);
        }
      });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWorkflow();
