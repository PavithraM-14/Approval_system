import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/gmail-service';

/**
 * Initiate Google OAuth flow for new users during signup
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_user', request.url)
      );
    }

    // Generate OAuth URL with state parameter to track user
    const authUrl = getAuthUrl();
    const urlWithState = `${authUrl}&state=${userId}`;

    // Redirect to Google OAuth
    return NextResponse.redirect(urlWithState);
  } catch (error) {
    console.error('Error initiating Google connection:', error);
    return NextResponse.redirect(
      new URL('/login?error=google_auth_failed', request.url)
    );
  }
}
