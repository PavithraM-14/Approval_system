import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testShareLinks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get ShareLink model
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false, strictPopulate: false }));

    // Find all share links
    const shareLinks = await ShareLink.find({}).lean();
    
    console.log(`\nFound ${shareLinks.length} share link(s):\n`);
    
    shareLinks.forEach((link: any, index: number) => {
      console.log(`${index + 1}. Token: ${link.token}`);
      console.log(`   URL: http://localhost:3000/share/${link.token}`);
      console.log(`   Created by ID: ${link.createdBy || 'Unknown'}`);
      console.log(`   Expires at: ${link.expiresAt}`);
      console.log(`   Is Active: ${link.isActive}`);
      console.log(`   Access Count: ${link.accessCount}`);
      console.log(`   Document ID: ${link.documentId || 'N/A'}`);
      console.log(`   Request Attachment: ${link.requestAttachment ? 'Yes' : 'No'}`);
      if (link.requestAttachment) {
        console.log(`   - File: ${link.requestAttachment.fileName}`);
        console.log(`   - Path: ${link.requestAttachment.filePath}`);
        console.log(`   - Request ID: ${link.requestAttachment.requestId}`);
      }
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testShareLinks();
