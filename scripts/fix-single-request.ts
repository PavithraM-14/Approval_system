import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync, readdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixSingleRequest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find the request
    const request = await Request.findOne({ requestId: '959997' });
    
    if (!request) {
      console.log('Request not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\nRequest 959997:');
    console.log('Title:', request.title);
    console.log('Current attachments:', request.attachments);

    // Check if the file exists in uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = readdirSync(uploadsDir);
    
    console.log('\nLooking for matching file in uploads directory...');
    
    // The attachment is just the MongoDB ID, let's see if there's a file that matches
    const attachmentId = request.attachments[0];
    const matchingFile = files.find(f => f.includes(attachmentId) || f === attachmentId);
    
    if (matchingFile) {
      console.log(`✓ Found matching file: ${matchingFile}`);
      
      // Update the request
      request.attachments = [`/uploads/${matchingFile}`];
      await request.save();
      
      console.log(`✓ Updated attachment path to: /uploads/${matchingFile}`);
    } else {
      console.log(`❌ No matching file found for: ${attachmentId}`);
      console.log('\nAvailable files:');
      files.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      
      // Use the sample PDF instead
      console.log('\nUsing sample-document.pdf instead...');
      request.attachments = ['/uploads/sample-document.pdf'];
      await request.save();
      console.log('✓ Updated to use sample-document.pdf');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSingleRequest();
