import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '../../../lib/gmail-service';
import { getDriveAuthUrl } from '../../../lib/google-drive-service';

/**
 * Test Google APIs Configuration
 * Visit: http://localhost:3000/api/test-google
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      gmailClientId: !!process.env.GMAIL_CLIENT_ID,
      gmailClientSecret: !!process.env.GMAIL_CLIENT_SECRET,
      gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback',
      driveClientId: !!(process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GMAIL_CLIENT_ID),
      driveClientSecret: !!(process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET),
      driveRedirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback',
    },
    tests: {
      gmail: { success: false, error: null, authUrl: null },
      drive: { success: false, error: null, authUrl: null },
    },
    summary: {
      allConfigured: false,
      readyToUse: false,
    },
  };

  // Test Gmail OAuth URL generation
  try {
    const gmailAuthUrl = getAuthUrl();
    results.tests.gmail = {
      success: true,
      error: null,
      authUrl: gmailAuthUrl,
    };
  } catch (error) {
    results.tests.gmail = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      authUrl: null,
    };
  }

  // Test Google Drive OAuth URL generation
  try {
    const driveAuthUrl = getDriveAuthUrl();
    results.tests.drive = {
      success: true,
      error: null,
      authUrl: driveAuthUrl,
    };
  } catch (error) {
    results.tests.drive = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      authUrl: null,
    };
  }

  // Summary
  results.summary.allConfigured = 
    results.environment.gmailClientId &&
    results.environment.gmailClientSecret &&
    results.environment.driveClientId &&
    results.environment.driveClientSecret;

  results.summary.readyToUse = 
    results.summary.allConfigured &&
    results.tests.gmail.success &&
    results.tests.drive.success;

  const status = results.summary.readyToUse ? 200 : 500;

  return NextResponse.json(results, { status });
}
