import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkRequestAttachments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get Request model
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find request with ID 100024
    const request = await Request.findOne({ requestId: '100024' }).lean();
    
    if (!request) {
      console.log('Request 100024 not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\nRequest 100024 Details:');
    console.log('Title:', request.title);
    console.log('Department:', request.department);
    console.log('Attachments:', request.attachments);
    console.log('');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRequestAttachments();
