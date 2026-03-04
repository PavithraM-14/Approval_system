import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function forceUpdateShareLink() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Update using findOneAndUpdate
    const result = await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '959997' },
      { 
        $set: { 
          'requestAttachment.filePath': '/uploads/sample-document.pdf',
          'requestAttachment.fileName': 'sample-document.pdf'
        } 
      },
      { new: true }
    );
    
    if (result) {
      console.log('\n✓ Updated share link for Request 959997');
      console.log('New file path:', result.requestAttachment.filePath);
      console.log('New file name:', result.requestAttachment.fileName);
      console.log('\nShare URL:', `http://localhost:3000/share/${result.token}`);
    } else {
      console.log('Share link not found');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceUpdateShareLink();
