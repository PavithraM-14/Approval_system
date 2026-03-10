# Automatic Google Account Connection

## Overview
When a new user signs up, they are automatically redirected to connect their Google account after email verification. This enables Gmail and Google Drive integration features.

## Flow

1. **User Signup** → User fills signup form
2. **OTP Verification** → User verifies email with OTP
3. **Account Creation** → System creates user account
4. **Auto Google OAuth** → User is automatically redirected to Google OAuth consent screen
5. **Token Storage** → Google tokens are saved to user profile
6. **Login Redirect** → User is redirected to login page with success message

## Technical Implementation

### 1. Signup Route (`app/api/auth/signup/route.ts`)
- Returns `googleAuthUrl` and `requiresGoogleAuth: true` in response
- Frontend uses this to redirect user to Google OAuth

### 2. Google Connect Route (`app/api/auth/google-connect/route.ts`)
- Receives `userId` as query parameter
- Generates Google OAuth URL with `state` parameter containing userId
- Redirects user to Google consent screen

### 3. Gmail Callback Route (`app/api/gmail/callback/route.ts`)
- Handles OAuth callback from Google
- Checks for `state` parameter to identify new signup flow
- Exchanges authorization code for access/refresh tokens
- Saves tokens to user record:
  - `gmailAccessToken`
  - `gmailRefreshToken`
  - `gmailTokenExpiry`
  - `gmailEnabled: true`
  - `driveAccessToken`
  - `driveRefreshToken`
  - `driveTokenExpiry`
  - `driveEnabled: true`
- Redirects to login page with success message

### 4. Frontend (`app/signup/page.tsx`)
- After OTP verification, checks response for `requiresGoogleAuth`
- If true, redirects to `googleAuthUrl` using `window.location.href`

## User Model Fields

The User model includes these fields for Google integration:

```typescript
// Gmail integration
gmailAccessToken: String
gmailRefreshToken: String
gmailTokenExpiry: Date
gmailEnabled: Boolean (default: false)

// Google Drive integration
driveAccessToken: String
driveRefreshToken: String
driveTokenExpiry: Date
driveEnabled: Boolean (default: false)
driveFolderId: String // Root folder for user's documents
```

## OAuth Scopes

The following Google API scopes are requested:

- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify Gmail messages
- `https://www.googleapis.com/auth/drive.file` - Access Drive files created by app
- `https://www.googleapis.com/auth/drive.readonly` - Read Drive files
- `https://www.googleapis.com/auth/documents` - Access Google Docs
- `https://www.googleapis.com/auth/spreadsheets` - Access Google Sheets
- `https://www.googleapis.com/auth/presentations` - Access Google Slides

## Environment Variables Required

```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Error Handling

If Google OAuth fails or user denies permission:
- User is redirected to login page
- Error message is displayed via query parameter
- User can manually connect Google account later from dashboard

## Manual Connection

Users can also manually connect their Google account later:
1. Navigate to dashboard
2. Click "Connect Google Account" button
3. Complete OAuth flow
4. Tokens are saved to their profile

## Testing

To test the flow:
1. Clear database: `npm run clear-db`
2. Start dev server: `npm run dev`
3. Go to signup page
4. Complete signup form
5. Verify OTP
6. Should automatically redirect to Google OAuth
7. Grant permissions
8. Should redirect to login with success message
