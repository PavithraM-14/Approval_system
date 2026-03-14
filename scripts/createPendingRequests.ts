import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { RequestStatus } from '../lib/types';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function createPendingRequests() {
  await connectDB();

  console.log('🔍 Creating pending requests for testing reminders...');
  
  // Find users
  const employee = await User.findOne({ email: 'john.smith@default.com' });
  const manager = await User.findOne({ email: 'lisa.wilson@default.com' });
  
  if (!employee || !manager) {
    console.log('❌ Required users not found. Run npm run small first.');
    process.exit(1);
  }

  // Create a request that's been pending for "5 days" (we'll backdate it)
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const pendingRequest = await Request.create({
    requestId: '123456', // 6 digits as required
    title: 'Test Pending Request for Reminders',
    purpose: 'This is a test request that has been pending for 5 days to test the reminder system',
    requester: employee._id, // Use requester instead of requesterId
    status: RequestStatus.MANAGER_REVIEW,
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
    history: [
      {
        action: 'create', // Use lowercase as per ActionType enum
        actor: employee._id,
        timestamp: fiveDaysAgo,
        newStatus: RequestStatus.PENDING,
        notes: 'Request created'
      },
      {
        action: 'forward', // Use lowercase as per ActionType enum
        actor: employee._id,
        timestamp: fiveDaysAgo,
        newStatus: RequestStatus.MANAGER_REVIEW,
        notes: 'Forwarded to manager for review'
      }
    ]
  });

  console.log(`✅ Created pending request: ${pendingRequest.requestId}`);
  console.log(`📅 Created date: ${pendingRequest.createdAt}`);
  console.log(`📋 Status: ${pendingRequest.status}`);
  console.log(`👤 Assigned to: ${manager.email}`);

  console.log('\n🔔 Now run "npm run reminders" to test email sending!');
  
  process.exit(0);
}

createPendingRequests().catch(err => {
  console.error('❌ Failed to create pending requests:', err);
  process.exit(1);
});