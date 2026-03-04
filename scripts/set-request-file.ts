import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function setRequestFile() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('❌ Usage: npx tsx scripts/set-request-file.ts FILENAME [TITLE]');
    console.log('\nExample:');
    console.log('   npx tsx scripts/set-request-file.ts my-document.pdf "My Document Title"');
    process.exit(1);
  }

  const fileName = args[0];
  const title = args[1] || 'Uploaded Document';

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Check if file exists
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
    if (!existsSync(filePath)) {
      console.log(`\n❌ File not found: ${filePath}`);
      console.log('\nPlease copy your file to: approval_system/public/uploads/');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✓ File found: ${fileName}`);

    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));

    // Update request 225057
    console.log('\nUpdating Request 225057...');
    const request = await Request.findOneAndUpdate(
      { requestId: '225057' },
      { 
        $set: { 
          attachments: [`/uploads/${fileName}`],
          title: title
        } 
      },
      { new: true }
    );
    
    if (request) {
      console.log('✓ Updated Request 225057');
      console.log('  Title:', request.title);
      console.log('  Attachments:', request.attachments);
    }

    // Update share link
    console.log('\nUpdating share link...');
    const shareLink = await ShareLink.findOneAndUpdate(
      { 'requestAttachment.requestId': '225057' },
      { 
        $set: { 
          'requestAttachment.filePath': `/uploads/${fileName}`,
          'requestAttachment.fileName': fileName
        } 
      },
      { new: true }
    );
    
    if (shareLink) {
      console.log('✓ Updated share link');
      console.log('  File path:', shareLink.requestAttachment.filePath);
      console.log('  File name:', shareLink.requestAttachment.fileName);
      console.log('\n✅ Share URL:', `http://localhost:3000/share/${shareLink.token}`);
      console.log('\n🎉 Done! Your document is now shared.');
      console.log('   Refresh the share link page to see your document.');
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setRequestFile();
