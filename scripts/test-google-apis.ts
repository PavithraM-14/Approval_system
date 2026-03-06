/**
 * Google APIs Test Script
 * Tests Gmail and Google Drive API connectivity
 */

import { getAuthUrl } from '../lib/gmail-service';
import { getDriveAuthUrl } from '../lib/google-drive-service';

console.log('🔍 Testing Google APIs Configuration...\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking Environment Variables:');
console.log('-----------------------------------');

const gmailClientId = process.env.GMAIL_CLIENT_ID;
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
const gmailRedirectUri = process.env.GMAIL_REDIRECT_URI;

const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || gmailClientId;
const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || gmailClientSecret;
const driveRedirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

console.log(`✓ GMAIL_CLIENT_ID: ${gmailClientId ? '✅ Set' : '❌ Missing'}`);
console.log(`✓ GMAIL_CLIENT_SECRET: ${gmailClientSecret ? '✅ Set' : '❌ Missing'}`);
console.log(`✓ GMAIL_REDIRECT_URI: ${gmailRedirectUri || 'http://localhost:3000/api/gmail/callback (default)'}`);
console.log(`✓ GOOGLE_DRIVE_CLIENT_ID: ${driveClientId ? '✅ Set' : '❌ Missing'}`);
console.log(`✓ GOOGLE_DRIVE_CLIENT_SECRET: ${driveClientSecret ? '✅ Set' : '❌ Missing'}`);
console.log(`✓ GOOGLE_DRIVE_REDIRECT_URI: ${driveRedirectUri || 'http://localhost:3000/api/google-drive/callback (default)'}`);

// Test 2: Generate OAuth URLs
console.log('\n2️⃣ Testing OAuth URL Generation:');
console.log('-----------------------------------');

try {
  const gmailAuthUrl = getAuthUrl();
  console.log('✅ Gmail OAuth URL generated successfully');
  console.log(`   URL: ${gmailAuthUrl.substring(0, 80)}...`);
} catch (error) {
  console.log('❌ Failed to generate Gmail OAuth URL');
  console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

try {
  const driveAuthUrl = getDriveAuthUrl();
  console.log('✅ Google Drive OAuth URL generated successfully');
  console.log(`   URL: ${driveAuthUrl.substring(0, 80)}...`);
} catch (error) {
  console.log('❌ Failed to generate Google Drive OAuth URL');
  console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Test 3: Summary
console.log('\n3️⃣ Summary:');
console.log('-----------------------------------');

const allConfigured = gmailClientId && gmailClientSecret && driveClientId && driveClientSecret;

if (allConfigured) {
  console.log('✅ All Google API credentials are configured!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Start your development server: npm run dev');
  console.log('   2. Navigate to: http://localhost:3000/api/gmail/auth');
  console.log('   3. You should see an authUrl in the response');
  console.log('   4. Visit that URL to authorize the app');
  console.log('   5. You\'ll be redirected back to your app with tokens');
} else {
  console.log('❌ Some Google API credentials are missing!');
  console.log('\n📝 Required Actions:');
  console.log('   1. Go to: https://console.cloud.google.com/');
  console.log('   2. Create a new project or select existing one');
  console.log('   3. Enable Gmail API and Google Drive API');
  console.log('   4. Create OAuth 2.0 credentials');
  console.log('   5. Add credentials to your .env.local file');
}

console.log('\n✨ Test Complete!\n');
