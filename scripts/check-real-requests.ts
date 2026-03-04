import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkRealRequests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get Request model
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find requests with attachments
    const requests = await Request.find({ 
      attachments: { $exists: true, $ne: [] } 
    }).limit(5).lean();
    
    console.log(`\nFound ${requests.length} requests with attachments:\n`);
    
    requests.forEach((req: any, index: number) => {
      console.log(`${index + 1}. Request ID: ${req.requestId}`);
      console.log(`   Title: ${req.title}`);
      console.log(`   Department: ${req.department}`);
      console.log(`   Attachments:`);
      req.attachments.forEach((att: string) => {
        console.log(`   - ${att}`);
      });
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRealRequests();
