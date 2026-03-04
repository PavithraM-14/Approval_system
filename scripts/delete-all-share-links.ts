import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function deleteAllShareLinks() {
  try {
    console.log('⚠️  WARNING: This will delete ALL share links from the database!');
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    const countBefore = await ShareLink.countDocuments();
    console.log(`\nFound ${countBefore} share link(s) in database`);

    if (countBefore === 0) {
      console.log('No share links to delete.');
      await mongoose.disconnect();
      return;
    }

    console.log('\nDeleting all share links...');
    const result = await ShareLink.deleteMany({});
    
    console.log(`\n✓ Successfully deleted ${result.deletedCount} share link(s)`);

    const countAfter = await ShareLink.countDocuments();
    console.log(`✓ Remaining share links: ${countAfter}`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllShareLinks();
