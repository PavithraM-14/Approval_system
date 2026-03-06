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
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // userId for new signups

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

    await connectDB();

    // If state parameter exists, it's a new user signup flow
    if (state) {
      // Update user with Google tokens
      await User.findByIdAndUpdate(state, {
        $set: {
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token,
          gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          gmailEnabled: true,
          driveAccessToken: tokens.access_token,
          driveRefreshToken: tokens.refresh_token,
          driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          driveEnabled: true,
        },
      });

      return NextResponse.redirect(
        new URL('/login?success=account_created_google_connected', request.url)
      );
    }

    // Otherwise, it's an existing user connecting their account
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Save tokens to user record
    await User.findByIdAndUpdate(user.id, {
      $set: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        gmailEnabled: true,
        driveAccessToken: tokens.access_token,
        driveRefreshToken: tokens.refresh_token,
        driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        driveEnabled: true,
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
