import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixAllShareLinks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Find all share links with request attachments
    const shareLinks = await ShareLink.find({ 
      'requestAttachment': { $exists: true, $ne: null }
    });
    
    console.log(`\nFound ${shareLinks.length} share link(s) with request attachments\n`);

    let updated = 0;
    let deleted = 0;

    for (const shareLink of shareLinks) {
      const requestId = shareLink.requestAttachment.requestId;
      console.log(`Processing share link for Request ${requestId}...`);
      console.log(`  Current file path: ${shareLink.requestAttachment.filePath}`);

      // Check if request exists
      const request = await Request.findOne({ requestId: requestId });
      
      if (!request) {
        console.log(`  ❌ Request ${requestId} not found - deleting share link`);
        await ShareLink.deleteOne({ _id: shareLink._id });
        deleted++;
        continue;
      }

      if (!request.attachments || request.attachments.length === 0) {
        console.log(`  ❌ Request ${requestId} has no attachments - deleting share link`);
        await ShareLink.deleteOne({ _id: shareLink._id });
        deleted++;
        continue;
      }

      // Get the first attachment
      const actualFilePath = request.attachments[0];
      
      // Check if it needs updating
      if (shareLink.requestAttachment.filePath !== actualFilePath) {
        const actualFileName = path.basename(actualFilePath);
        
        console.log(`  ✓ Updating to: ${actualFilePath}`);
        
        shareLink.requestAttachment.filePath = actualFilePath;
        shareLink.requestAttachment.fileName = actualFileName;
        await shareLink.save();
        
        console.log(`  ✓ Updated share link\n`);
        updated++;
      } else {
        console.log(`  ✓ Already correct\n`);
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   Updated: ${updated} share link(s)`);
    console.log(`   Deleted: ${deleted} orphaned share link(s)`);

    // Show remaining share links
    const remainingLinks = await ShareLink.find({ 
      'requestAttachment': { $exists: true, $ne: null }
    });
    
    if (remainingLinks.length > 0) {
      console.log(`\n📋 Active Share Links (${remainingLinks.length}):\n`);
      for (const link of remainingLinks) {
        console.log(`   http://localhost:3000/share/${link.token}`);
        console.log(`   - Request: ${link.requestAttachment.requestId}`);
        console.log(`   - File: ${link.requestAttachment.filePath}`);
        console.log('');
      }
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAllShareLinks();
