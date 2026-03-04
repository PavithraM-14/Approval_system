import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function restoreOriginalFileIds() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    console.log('\n🔄 Restoring original MongoDB file IDs...\n');

    // Update Request 225057 back to original
    await Request.findOneAndUpdate(
      { requestId: '225057' },
      { $set: { attachments: ['69a6f83ddf188b54f8887aec'] } }
    );
    console.log('✓ Restored Request 225057 to original file ID');

    // Update share link for 225057
    await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '225057' },
      { 
        $set: { 
          'requestAttachment.filePath': '69a6f83ddf188b54f8887aec',
          'requestAttachment.fileName': '69a6f83ddf188b54f8887aec'
        } 
      }
    );
    console.log('✓ Restored share link for Request 225057');

    // Update Request 761847 back to original
    await Request.findOneAndUpdate(
      { requestId: '761847' },
      { $set: { attachments: ['69a6fce5df188b54f8887b6e'] } }
    );
    console.log('✓ Restored Request 761847 to original file ID');

    // Update share link for 761847
    await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '761847' },
      { 
        $set: { 
          'requestAttachment.filePath': '69a6fce5df188b54f8887b6e',
          'requestAttachment.fileName': '69a6fce5df188b54f8887b6e'
        } 
      }
    );
    console.log('✓ Restored share link for Request 761847');

    console.log('\n✅ All file IDs restored to original MongoDB IDs');
    console.log('\n📋 Your share links now work with the actual uploaded files!');
    console.log('\nShare Links:');
    console.log('1. http://localhost:3000/share/2a9799c68a20367e6f21483590ac261863646080038883e41369058930a47885');
    console.log('2. http://localhost:3000/share/fdb5c7474060dce6a437b7b5f6268fba8d6a5877c3a0d48c1a0ea77ae1daadd7');
    console.log('\n🎉 Refresh the page to see your actual uploaded documents!');

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreOriginalFileIds();
