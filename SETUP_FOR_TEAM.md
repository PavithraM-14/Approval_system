# Setup Guide for Team Members

## Prerequisites
- Node.js (v18 or higher)
- Git

## Setup Steps

### 1. Clone the Repository
```bash
git clone https://github.com/PavithraM-14/SRM_APPROVAL_SYSTEM_.git
cd SRM_APPROVAL_SYSTEM_
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env.local` File
Create a file named `.env.local` in the root directory with the following content:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://pavi_28:srmeec12@cluster0.7ntfbrr.mongodb.net/?appName=Cluster0

# App Configuration
NEXT_PUBLIC_APP_NAME=SRM-RMP Institutional Approval
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# JWT Secret for dev authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Upload directory
UPLOAD_DIR=./public/uploads

# Email Configuration (Gmail SMTP with App Password)
EMAIL_USER=srmapprovaldev123@gmail.com
EMAIL_PASSWORD=wncb mxsx muhb ezii
```

**IMPORTANT:** Make sure to copy the email credentials exactly as shown above. The email system uses Gmail SMTP and requires these credentials to send OTP emails.

### 4. Run the Development Server
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Common Issues

### "Failed to send OTP" Error
This error occurs when:
1. `.env.local` file is missing
2. Email credentials are incorrect or missing
3. Email credentials have extra spaces

**Solution:**
- Make sure `.env.local` exists in the root directory
- Copy the email configuration exactly as shown above
- Restart the dev server after creating/updating `.env.local`

### Email Not Received
- Check spam/junk folder
- Wait 1-2 minutes (sometimes emails are delayed)
- Try resending OTP

### MongoDB Connection Error
- Make sure you're connected to the internet
- The MongoDB URI is shared and should work for all team members

## Testing the Setup

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter your email
4. You should receive an OTP email within 1-2 minutes
5. Enter the OTP to complete signup

## Need Help?
Contact the project maintainer if you encounter any issues.
