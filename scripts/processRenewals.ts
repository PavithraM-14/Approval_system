/**
 * Process Automatic Renewals Script
 * Run this script periodically (e.g., daily via cron/scheduler) to check for and create renewal requests
 * 
 * Usage: npx tsx scripts/processRenewals.ts
 */

import { processRenewals } from '../lib/renewal-service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔄 Starting automatic renewal processing...');
  console.log(`⏰ Current time: ${new Date().toISOString()}\n`);

  try {
    const result = await processRenewals();

    console.log('\n✅ Renewal processing completed!');
    console.log('─────────────────────────────────');
    console.log(`📊 Requests processed: ${result.processed}`);
    console.log(`✨ New renewals created: ${result.created}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No errors');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during renewal processing:');
    console.error(error);
    process.exit(1);
  }
}

main();
