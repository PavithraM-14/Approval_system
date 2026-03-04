import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function verifyShareSetup() {
  console.log('🔍 Verifying Share Link Setup...\n');

  let allGood = true;

  // 1. Check if sample PDF exists
  const samplePdfPath = path.join(process.cwd(), 'public', 'uploads', 'sample-document.pdf');
  if (existsSync(samplePdfPath)) {
    console.log('✅ Sample PDF exists at /public/uploads/sample-document.pdf');
  } else {
    console.log('❌ Sample PDF not found. Run: npx tsx scripts/create-sample-pdf.ts');
    allGood = false;
  }

  // 2. Check MongoDB connection
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB connection successful');

    // 3. Check ShareLink model
    const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', new mongoose.Schema({}, { strict: false }));
    const shareLinkCount = await ShareLink.countDocuments();
    console.log(`✅ Found ${shareLinkCount} share link(s) in database`);

    // 4. Check Request attachments
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
    const requestsWithAttachments = await Request.countDocuments({ 
      attachments: { $exists: true, $ne: [] } 
    });
    console.log(`✅ Found ${requestsWithAttachments} request(s) with attachments`);

    // 5. Check if attachments have correct paths
    const badPaths = await Request.countDocuments({ 
      $or: [
        { attachments: 'sample-document.pdf' },
        { attachments: { $regex: '^[^/]', $options: 'i' } } // Starts without /
      ]
    });
    if (badPaths === 0) {
      console.log('✅ All request attachments have correct paths');
    } else {
      console.log(`⚠️  Found ${badPaths} request(s) that might have incorrect paths`);
    }

    // 6. Check environment variables
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      console.log(`✅ NEXT_PUBLIC_BASE_URL is set: ${process.env.NEXT_PUBLIC_BASE_URL}`);
    } else {
      console.log('❌ NEXT_PUBLIC_BASE_URL not set in .env.local');
      allGood = false;
    }

    // 7. List active share links
    const activeLinks = await ShareLink.find({ isActive: true }).lean();
    if (activeLinks.length > 0) {
      console.log(`\n📋 Active Share Links (${activeLinks.length}):`);
      activeLinks.forEach((link: any, index: number) => {
        const url = `${process.env.NEXT_PUBLIC_BASE_URL}/share/${link.token}`;
        console.log(`\n${index + 1}. ${url}`);
        console.log(`   Expires: ${new Date(link.expiresAt).toLocaleString()}`);
        console.log(`   Access Count: ${link.accessCount}`);
        console.log(`   Watermark: ${link.watermarkEnabled ? 'Yes' : 'No'}`);
        console.log(`   Download: ${link.allowDownload ? 'Allowed' : 'Blocked'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');

  } catch (error) {
    console.log('❌ MongoDB connection failed:', error);
    allGood = false;
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('✅ All checks passed! Share link feature is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Login at: http://localhost:3000/login');
    console.log('3. Go to Documents page');
    console.log('4. Click Share button on any document');
    console.log('5. Test the generated link in incognito mode');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
  }
  console.log('='.repeat(50));
}

verifyShareSetup();
