import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function forceUpdateRequest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Update using findOneAndUpdate
    const result = await Request.findOneAndUpdate(
      { requestId: '959997' },
      { $set: { attachments: ['/uploads/sample-document.pdf'] } },
      { new: true }
    );
    
    if (result) {
      console.log('\n✓ Updated Request 959997');
      console.log('New attachments:', result.attachments);
    } else {
      console.log('Request not found');
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceUpdateRequest();
