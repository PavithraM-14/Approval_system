import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixShareLinkPaths() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get models
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find all share links with request attachments
    const shareLinks = await ShareLink.find({ 
      'requestAttachment': { $exists: true, $ne: null }
    });
    
    console.log(`\nFound ${shareLinks.length} share link(s) with request attachments\n`);

    let updated = 0;
    for (const shareLink of shareLinks) {
      const requestId = shareLink.requestAttachment.requestId;
      console.log(`Processing share link for Request ${requestId}...`);
      console.log(`  Current file path: ${shareLink.requestAttachment.filePath}`);
      console.log(`  Current file name: ${shareLink.requestAttachment.fileName}`);

      // Fetch the actual request
      const request = await Request.findOne({ requestId: requestId });
      
      if (!request) {
        console.log(`  ❌ Request ${requestId} not found`);
        continue;
      }

      if (!request.attachments || request.attachments.length === 0) {
        console.log(`  ❌ Request ${requestId} has no attachments`);
        continue;
      }

      // Get the first attachment (assuming single attachment for now)
      const actualFilePath = request.attachments[0];
      const actualFileName = path.basename(actualFilePath);

      console.log(`  ✓ Found actual file path: ${actualFilePath}`);
      console.log(`  ✓ Found actual file name: ${actualFileName}`);

      // Update the share link
      shareLink.requestAttachment.filePath = actualFilePath;
      shareLink.requestAttachment.fileName = actualFileName;
      await shareLink.save();

      console.log(`  ✓ Updated share link\n`);
      updated++;
    }

    console.log(`\n✓ Updated ${updated} share link(s) successfully`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixShareLinkPaths();
