import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { getTokensFromCode } from '../../../../lib/gmail-service';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

/**
 * Handle Gmail OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=gmail_auth_failed&details=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=no_auth_code', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Save tokens to user record
    await connectDB();
    await User.findByIdAndUpdate(user.id, {
      $set: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date,
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard?success=gmail_connected', request.url)
    );
  } catch (error) {
    console.error('Error handling Gmail callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=gmail_callback_failed', request.url)
    );
  }
}
