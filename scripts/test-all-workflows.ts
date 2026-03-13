#!/usr/bin/env node

/**
 * Test All Workflows
 * 
 * Seeds and tests all four workflows
 */

import { execSync } from 'child_process';

const workflows = [
  { name: 'small', seedCommand: 'npm run small' },
  { name: 'medium', seedCommand: 'npm run medium' },
  { name: 'large', seedCommand: 'npm run large' },
  { name: 'university', seedCommand: 'npm run university' },
];

console.log('🧪 Testing All Workflows\n');
console.log('='.repeat(70));

const results: Record<string, boolean> = {};

for (const workflow of workflows) {
  console.log(`\n📋 Seeding and testing ${workflow.name.toUpperCase()} workflow...`);
  
  // Seed the workflow first
  try {
    console.log(`  🌱 Seeding...`);
    execSync(workflow.seedCommand, {
      stdio: 'pipe', // Hide output
      cwd: process.cwd(),
    });
    console.log(`  ✅ Seeded successfully`);
  } catch (error) {
    console.log(`  ❌ Seeding failed`);
    results[workflow.name] = false;
    continue;
  }
  
  // Test the workflow
  try {
    console.log(`  🧪 Testing...`);
    execSync(`npx tsx scripts/test-workflow-flow.ts ${workflow.name}`, {
      stdio: 'pipe', // Hide output
      cwd: process.cwd(),
    });
    results[workflow.name] = true;
    console.log(`  ✅ ${workflow.name.toUpperCase()} workflow PASSED\n`);
  } catch (error) {
    results[workflow.name] = false;
    console.log(`  ❌ ${workflow.name.toUpperCase()} workflow FAILED\n`);
  }
}

console.log('='.repeat(70));
console.log('\n📊 SUMMARY\n');

let allPassed = true;
for (const workflow of workflows) {
  const status = results[workflow.name] ? '✅ PASSED' : '❌ FAILED';
  console.log(`  ${workflow.name.padEnd(12)} ${status}`);
  if (!results[workflow.name]) allPassed = false;
}

console.log('\n' + '='.repeat(70));

if (allPassed) {
  console.log('\n🎉 ALL WORKFLOWS PASSED!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME WORKFLOWS FAILED\n');
  process.exit(1);
}
