import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function deleteOrphanedShareLinks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Delete share links for requests 100024 and 220842 (which don't exist)
    const result = await ShareLink.deleteMany({
      'requestAttachment.requestId': { $in: ['100024', '220842'] }
    });
    
    console.log(`\n✓ Deleted ${result.deletedCount} orphaned share link(s)`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteOrphanedShareLinks();
