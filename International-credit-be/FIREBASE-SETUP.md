# Firebase Console Setup Guide

## Overview
Your Universal Credit backend now uses Firebase for push notifications and email services (via extensions). This guide explains what you need to configure in the Firebase Console.

## Current Configuration Status ✅

Your project is already configured with:
- Firebase Admin SDK initialized with service account key
- Project ID: `universalcredit-bc5df` (from firebase-service-account.json)
- Push notifications fully functional
- Email service placeholder implemented (ready for Firebase Extensions)

## Firebase Console Operations Needed

### 1. Push Notifications (Already Configured) ✅
Your Firebase project is already set up for push notifications. No additional console operations needed.

### 2. Email Service Setup (Recommended)

Currently, emails are logged but not sent. To enable actual email sending:

#### Option A: Firebase Extensions (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `universalcredit-bc5df`
3. Navigate to **Extensions** in the sidebar
4. Install one of these email extensions:

**Trigger Email (SendGrid):**
```
Extension ID: firebase/firestore-send-email
Provider: SendGrid
```

**Trigger Email (Mailgun):**
```
Extension ID: firebase/firestore-send-email
Provider: Mailgun
```

5. Configure the extension with your email service credentials
6. Update `FirebaseNotificationService.js` to use Firestore triggers instead of the current placeholder

#### Option B: Cloud Functions (Advanced)
1. Create Cloud Functions that listen to Firestore documents
2. Use SendGrid/Mailgun APIs within the functions
3. Trigger functions from your backend

### 3. Required Environment Variables ✅

Already configured in your project:
```bash
FIREBASE_PROJECT_ID=universalcredit-bc5df
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### 4. Service Account Permissions ✅

Your service account already has the required permissions:
- Firebase Admin SDK
- Cloud Messaging (FCM)
- Firestore access

## Email Templates Implemented ✅

The following email templates are ready:

1. **Email Verification** - Sent on user registration
2. **Password Reset** - Sent on forgot password
3. **2FA Enabled** - Sent when 2FA is activated
4. **KYC Approval** - Sent when KYC is approved

## API Endpoints Available ✅

### Email Verification Flow:
- `POST /auth/register` - Registers user and sends verification email
- `POST /auth/verify-email/:token` - Verifies email with token
- `POST /auth/resend-verification` - Resends verification email

### Password Reset Flow:
- `POST /auth/forgot-password` - Sends password reset email
- `POST /auth/reset-password` - Resets password with token

## Testing the Email Flow

### 1. Development Testing (Current State)
Emails are currently logged to console. Check your server logs to see email content:

```bash
npm start
# Look for: "Email would be sent (Firebase email not configured)"
```

### 2. Production Setup
After installing Firebase Extensions:

1. Test user registration:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

2. Check Firebase Console > Extensions > Logs for email delivery status

## Firebase Console Navigation

1. **Project Overview** - Basic project info
2. **Authentication** - User management (not used currently, using custom MongoDB auth)
3. **Firestore Database** - Document database (used by Extensions for email queuing)
4. **Cloud Messaging** - Push notifications ✅ (already configured)
5. **Extensions** - Email service installation needed
6. **Settings > Service Accounts** - Your service account key ✅

## Security Notes ⚠️

- Service account JSON file is already properly configured
- Never commit `firebase-service-account.json` to version control
- Current configuration follows Firebase security best practices
- Email content includes user data - ensure compliance with privacy laws

## Troubleshooting

### Common Issues:

1. **Firebase not initialized error:**
   - Check `firebase-service-account.json` exists in project root
   - Verify FIREBASE_PROJECT_ID environment variable

2. **Push notifications not working:**
   - Verify FCM tokens are being registered by clients
   - Check Firebase Console > Cloud Messaging for delivery reports

3. **Emails not sending (after Extensions setup):**
   - Check Extensions logs in Firebase Console
   - Verify email service provider credentials
   - Check Firestore for queued email documents

## Cost Considerations 💰

- **Push Notifications**: Free up to 100M messages/month
- **Firestore**: Pay-as-you-go (minimal cost for email queuing)
- **Email Extensions**: Depends on provider (SendGrid/Mailgun pricing)
- **Cloud Functions**: Pay-as-you-go execution

## Next Steps

1. ✅ Email verification API is complete and functional
2. ⏳ Install Firebase Extension for actual email sending
3. ⏳ Test email delivery in production
4. ⏳ Monitor email delivery rates and costs

Your email verification system is fully implemented and ready for production use once you enable Firebase Extensions for email delivery.