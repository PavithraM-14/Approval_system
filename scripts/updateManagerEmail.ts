import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import User from '../models/User';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function updateManagerEmail() {
  await connectDB();

  console.log('📧 Updating manager email for reminder testing...');
  
  // Find Lisa Wilson (one of the managers) and update her email
  const manager = await User.findOne({ email: 'lisa.wilson@default.com' });
  
  if (!manager) {
    console.log('❌ Manager not found. Make sure you ran npm run small first.');
    process.exit(1);
  }

  // Update the email to your actual email
  manager.email = 'mdkhubaib94@gmail.com';
  await manager.save();

  console.log(`✅ Updated manager email:`);
  console.log(`👤 Name: ${manager.name}`);
  console.log(`📧 Old email: lisa.wilson@default.com`);
  console.log(`📧 New email: ${manager.email}`);
  console.log(`🏢 Role: Manager`);
  
  console.log('\n🔔 Now when you run "npm run reminders", emails will be sent to mdkhubaib94@gmail.com');
  
  process.exit(0);
}

updateManagerEmail().catch(err => {
  console.error('❌ Failed to update email:', err);
  process.exit(1);
});