import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixRequest761847() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Update request 761847 to use sample PDF
    console.log('\nUpdating Request 761847...');
    const request = await Request.findOneAndUpdate(
      { requestId: '761847' },
      { 
        $set: { 
          attachments: ['/uploads/sample-document.pdf']
        } 
      },
      { new: true }
    );
    
    if (request) {
      console.log('✓ Updated Request 761847');
      console.log('  Title:', request.title);
      console.log('  Attachments:', request.attachments);
    }

    // Update share link
    console.log('\nUpdating share link...');
    const shareLink = await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '761847' },
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
      console.log('  File path:', shareLink.requestAttachment.filePath);
      console.log('  File name:', shareLink.requestAttachment.fileName);
      console.log('\n✅ Share URL:', `http://localhost:3000/share/${shareLink.token}`);
      console.log('\n🎉 Done! Refresh the share link page to see the document.');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRequest761847();
