import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixRequestAttachments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get Request model
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find all requests with sample-document.pdf
    const requests = await Request.find({ 
      attachments: 'sample-document.pdf'
    });
    
    console.log(`\nFound ${requests.length} requests to update\n`);

    let updated = 0;
    for (const request of requests) {
      console.log(`Updating Request ${request.requestId}...`);
      console.log(`  Before: ${JSON.stringify(request.attachments)}`);
      
      // Update the attachment path
      request.attachments = request.attachments.map((att: string) => {
        if (att === 'sample-document.pdf') {
          return '/uploads/sample-document.pdf';
        }
        if (!att.startsWith('/uploads/') && !att.startsWith('http')) {
          return `/uploads/${att}`;
        }
        return att;
      });
      
      console.log(`  After: ${JSON.stringify(request.attachments)}`);
      await request.save();
      updated++;
    }

    console.log(`\n✓ Updated ${updated} requests successfully`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRequestAttachments();
