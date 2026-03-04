import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixCurrentRequest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Update request 225057
    console.log('\nUpdating Request 225057...');
    const request = await Request.findOneAndUpdate(
      { requestId: '225057' },
      { 
        $set: { 
          attachments: ['/uploads/sample-document.pdf'],
          title: 'Sample Request Document' // Give it a better title
        } 
      },
      { new: true }
    );
    
    if (request) {
      console.log('✓ Updated Request 225057');
      console.log('  New title:', request.title);
      console.log('  New attachments:', request.attachments);
    } else {
      console.log('❌ Request not found');
    }

    // Update share link
    console.log('\nUpdating share link...');
    const shareLink = await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '225057' },
      { 
        $set: { 
          'requestAttachment.filePath': '/uploads/sample-document.pdf',
          'requestAttachment.fileName': 'sample-document.pdf'
        } 
      },
      { new: true }
    );
    
    if (shareLink) {
      console.log('✓ Updated share link');
      console.log('  New file path:', shareLink.requestAttachment.filePath);
      console.log('  New file name:', shareLink.requestAttachment.fileName);
      console.log('\n✓ Share URL:', `http://localhost:3000/share/${shareLink.token}`);
    } else {
      console.log('❌ Share link not found');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixCurrentRequest();
