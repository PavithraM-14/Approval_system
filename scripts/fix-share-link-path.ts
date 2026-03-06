import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixShareLinkPath() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get ShareLink model
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Find the share link
    const shareLink = await ShareLink.findOne({ 
      token: '9cc4f72323d72bd25355fb3da2d92f8cd14d55a47fe8a39540ca2e5d653a81a0' 
    });
    
    if (!shareLink) {
      console.log('Share link not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\nBefore update:');
    console.log('File Path:', shareLink.requestAttachment.filePath);

    // Update the file path
    shareLink.requestAttachment.filePath = '/uploads/sample-document.pdf';
    await shareLink.save();

    console.log('\nAfter update:');
    console.log('File Path:', shareLink.requestAttachment.filePath);
    console.log('\n✓ Share link updated successfully');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixShareLinkPath();
