import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus } from '../lib/types';
import { notifyApprovalReminder } from '../lib/notification-service';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testReminders() {
  await connectDB();

  console.log('🔍 Checking database contents...');
  
  // Check total requests
  const totalRequests = await Request.countDocuments();
  console.log(`📊 Total requests in database: ${totalRequests}`);
  
  if (totalRequests > 0) {
    // Get any request for testing
    const anyRequest = await Request.findOne({}).limit(1);
    if (anyRequest) {
      console.log(`📋 Sample request: ${anyRequest.requestId} - Status: ${anyRequest.status}`);
      
      // Find any user to send a test email
      const testUser = await User.findOne({}).limit(1);
      if (testUser) {
        console.log(`📧 Sending test reminder to: ${testUser.email}`);
        
        // Test email sending directly without creating notification
        try {
          const { notifyApprovalReminder } = await import('../lib/notification-service');
          await notifyApprovalReminder(
            testUser._id.toString(),
            anyRequest._id.toString(), // Use real request ID
            anyRequest.title || 'Test Request',
            5
          );
          console.log('✅ Test reminder sent successfully!');
        } catch (error) {
          console.error('❌ Failed to send test reminder:', error);
        }
      }
    }
  } else {
    console.log('ℹ️ No requests found in database. You need to create some requests first.');
  }

  // Check email configuration
  console.log('\n📧 Email Configuration Check:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set'}`);
  console.log(`BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}`);

  process.exit(0);
}

testReminders().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});