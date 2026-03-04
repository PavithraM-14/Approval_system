import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { readdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function updateRequestFile() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // List available files in uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = readdirSync(uploadsDir);
    
    console.log('\n📁 Available files in uploads directory:\n');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    console.log('\n💡 To update Request 225057 with your file:');
    console.log('1. Copy your PDF file to: approval_system/public/uploads/');
    console.log('2. Note the filename');
    console.log('3. Run this command:');
    console.log('   npx tsx scripts/set-request-file.ts YOUR_FILENAME.pdf "Your Document Title"');
    console.log('\nExample:');
    console.log('   npx tsx scripts/set-request-file.ts my-document.pdf "My Important Document"');

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateRequestFile();
