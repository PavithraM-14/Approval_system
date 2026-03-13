#!/usr/bin/env node

/**
 * Test All Workflow Visibility
 * 
 * Tests request visibility for all roles across all four workflows
 */

import { execSync } from 'child_process';

const workflows = [
  { name: 'small', seedCommand: 'npm run small' },
  { name: 'medium', seedCommand: 'npm run medium' },
  { name: 'large', seedCommand: 'npm run large' },
  { name: 'university', seedCommand: 'npm run university' },
];

console.log('🔍 Testing Visibility for All Workflows\n');
console.log('='.repeat(80));

const results: Record<string, boolean> = {};

for (const workflow of workflows) {
  console.log(`\n📋 Testing ${workflow.name.toUpperCase()} workflow visibility...`);
  
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
  
  // Test visibility
  try {
    console.log(`  🔍 Testing visibility...`);
    execSync(`npx tsx scripts/test-role-visibility.ts ${workflow.name}`, {
      stdio: 'inherit', // Show output
      cwd: process.cwd(),
    });
    results[workflow.name] = true;
    console.log(`  ✅ ${workflow.name.toUpperCase()} visibility test PASSED\n`);
  } catch (error) {
    results[workflow.name] = false;
    console.log(`  ❌ ${workflow.name.toUpperCase()} visibility test FAILED\n`);
  }
}

console.log('='.repeat(80));
console.log('\n📊 SUMMARY\n');

let allPassed = true;
for (const workflow of workflows) {
  const status = results[workflow.name] ? '✅ PASSED' : '❌ FAILED';
  console.log(`  ${workflow.name.padEnd(12)} ${status}`);
  if (!results[workflow.name]) allPassed = false;
}

console.log('\n' + '='.repeat(80));

if (allPassed) {
  console.log('\n🎉 ALL VISIBILITY TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME VISIBILITY TESTS FAILED\n');
  process.exit(1);
}
