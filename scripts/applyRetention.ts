import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb';
import { applyRetentionPolicies, checkUpcomingRetentions } from '../lib/retention-service';

/**
 * This script applies retention policies to old requests
 * Run this periodically (e.g., weekly) via cron or Task Scheduler
 * 
 * Usage: npm run retention
 */

async function run() {
  try {
    console.log('🔄 Starting retention policy application...\n');
    
    await connectDB();
    
    // Check for upcoming retentions first
    console.log('📋 Checking for upcoming retentions...');
    const upcoming = await checkUpcomingRetentions();
    
    if (upcoming.length > 0) {
      console.log(`\n⚠️  Found ${upcoming.length} policies with upcoming actions:\n`);
      upcoming.forEach(item => {
        console.log(`  Policy: ${item.policy}`);
        console.log(`  Action: ${item.action}`);
        console.log(`  Days until action: ${item.daysUntilAction}`);
        console.log(`  Affected requests: ${item.affectedRequests}`);
        console.log('');
      });
    } else {
      console.log('✓ No upcoming retentions found\n');
    }
    
    // Apply retention policies
    console.log('🔧 Applying retention policies...');
    const results = await applyRetentionPolicies();
    
    console.log('\n✅ Retention policy application complete!\n');
    console.log('Results:');
    console.log(`  Archived: ${results.archived}`);
    console.log(`  Deleted: ${results.deleted}`);
    console.log(`  Notified: ${results.notified}`);
    console.log(`  Errors: ${results.errors}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying retention policies:', error);
    process.exit(1);
  }
}

run();
