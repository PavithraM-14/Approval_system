import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkRequest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    const request = await Request.findOne({ requestId: '761847' });
    
    if (request) {
      console.log('Request 761847:');
      console.log('  Title:', request.title);
      console.log('  Attachments:', request.attachments);
      console.log('  Department:', request.department);
    } else {
      console.log('Request 761847 not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRequest();
