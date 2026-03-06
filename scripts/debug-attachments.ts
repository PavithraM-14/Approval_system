import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function debugAttachments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find requests with attachments
    const requests = await Request.find({ 
      attachments: { $exists: true, $ne: [] } 
    }).limit(3).lean();
    
    console.log('Sample requests with attachments:\n');
    
    requests.forEach((req: any) => {
      console.log(`Request ${req.requestId}:`);
      console.log('  Attachments:', JSON.stringify(req.attachments));
      console.log('  Type:', typeof req.attachments);
      console.log('  Is Array:', Array.isArray(req.attachments));
      if (Array.isArray(req.attachments)) {
        req.attachments.forEach((att: any, i: number) => {
          console.log(`  [${i}]: "${att}" (type: ${typeof att})`);
        });
      }
      console.log('');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAttachments();
