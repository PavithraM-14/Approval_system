import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import Request from '../models/Request';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function resetReminderTimestamp() {
  await connectDB();

  console.log('🔄 Resetting reminder timestamp to allow new email...');
  
  // Find the test request and clear the lastReminderSent field
  const request = await Request.findOne({ requestId: '123456' });
  
  if (!request) {
    console.log('❌ Test request not found.');
    process.exit(1);
  }

  // Clear the lastReminderSent timestamp
  request.lastReminderSent = undefined;
  await request.save();

  console.log(`✅ Reset reminder timestamp for request: ${request.requestId}`);
  console.log(`📋 Status: ${request.status}`);
  console.log(`📅 Created: ${request.createdAt}`);
  
  console.log('\n🔔 Now run "npm run reminders" to send email to mdkhubaib94@gmail.com');
  
  process.exit(0);
}

resetReminderTimestamp().catch(err => {
  console.error('❌ Failed to reset timestamp:', err);
  process.exit(1);
});