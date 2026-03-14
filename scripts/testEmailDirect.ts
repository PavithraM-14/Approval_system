import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import { notifyApprovalReminder } from '../lib/notification-service';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testEmailDirect() {
  await connectDB();

  console.log('📧 Testing email functionality directly...');
  
  // Find any user to send a test email
  const testUser = await User.findOne({}).limit(1);
  
  if (!testUser) {
    console.log('❌ No users found. Run npm run small first.');
    process.exit(1);
  }

  console.log(`📧 Sending test reminder to: ${testUser.email}`);
  console.log(`👤 User: ${testUser.name}`);

  try {
    // Create a fake ObjectId for testing
    const fakeRequestId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
    
    await notifyApprovalReminder(
      testUser._id.toString(),
      fakeRequestId,
      'Test Reminder - Office Supplies Request',
      5
    );
    
    console.log('✅ Test reminder sent successfully!');
    console.log('📬 Check the email inbox for: ' + testUser.email);
    
  } catch (error) {
    console.error('❌ Failed to send test reminder:', error);
  }

  process.exit(0);
}

testEmailDirect().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});