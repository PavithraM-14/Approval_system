import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { google } from 'googleapis';

/**
 * Test Gmail connection and send a simple test email
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Gmail tokens
    const userDoc = await User.findById(user.id);
    if (!userDoc?.gmailAccessToken || !userDoc?.gmailRefreshToken) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 400 }
      );
    }

    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: userDoc.gmailAccessToken,
      refresh_token: userDoc.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create a simple test email
    const emailContent = [
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: Test Email from S.E.A.D.`,
      '',
      'This is a test email from the S.E.A.D. system.',
      '',
      `Sent by: ${user.name} (${user.email})`,
      `Time: ${new Date().toLocaleString()}`,
    ].join('\r\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[Gmail Test] Sending test email to:', to);
    console.log('[Gmail Test] From user:', user.email);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('[Gmail Test] Email sent successfully:', response.data);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: response.data.id,
      threadId: response.data.threadId,
      sentTo: to,
      sentFrom: user.email,
    });
  } catch (error: any) {
    console.error('[Gmail Test] Error:', error);
    console.error('[Gmail Test] Error details:', error.response?.data || error.message);
    
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error.message,
        errorData: error.response?.data,
      },
      { status: 500 }
    );
  }
}
