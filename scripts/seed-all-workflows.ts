#!/usr/bin/env node

/**
 * Seed All Workflows
 * 
 * Seeds all four workflows into the database
 */

import { execSync } from 'child_process';

const workflows = [
  { name: 'small', command: 'npm run small' },
  { name: 'medium', command: 'npm run medium' },
  { name: 'large', command: 'npm run large' },
  { name: 'university', command: 'npm run university' },
];

console.log('🌱 Seeding All Workflows\n');
console.log('='.repeat(70));

for (const workflow of workflows) {
  console.log(`\n📦 Seeding ${workflow.name.toUpperCase()} workflow...`);
  
  try {
    execSync(workflow.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`✅ ${workflow.name.toUpperCase()} workflow seeded\n`);
  } catch (error) {
    console.log(`❌ ${workflow.name.toUpperCase()} workflow failed\n`);
    process.exit(1);
  }
}

console.log('='.repeat(70));
console.log('\n🎉 ALL WORKFLOWS SEEDED SUCCESSFULLY!\n');
