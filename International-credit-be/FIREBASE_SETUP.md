# Firebase Cloud Messaging Setup

This document explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Universal Credit backend.

## Changes Made

### 1. Removed Web Push Dependencies
- Removed `web-push` package
- Removed VAPID configuration from config
- Updated `.env.example` to remove VAPID keys

### 2. Added Firebase Integration
- Installed `firebase-admin` package
- Created `FirebaseNotificationService` for FCM operations
- Added FCM token management to User model
- Created notification processor for background jobs
- Added FCM token management endpoints

### 3. Updated Database Configuration
- Updated MongoDB configuration for Atlas compatibility
- Added compression and connection pool settings optimized for Atlas
- Updated default connection string format for Atlas

## Firebase Project Setup
<!-- 
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAUraibK3IgG703oIQzqSqduRp0V9sj0kc",
  authDomain: "credit-50142.firebaseapp.com",
  projectId: "credit-50142",
  storageBucket: "credit-50142.firebasestorage.app",
  messagingSenderId: "225563741325",
  appId: "1:225563741325:web:e51f517d7cf492c7f526c4",
  measurementId: "G-FK9GGHTFQF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); -->

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Cloud Messaging in the project

### Step 2: Generate Service Account Key
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content

### Step 3: Configure Environment Variables
Add these to your `.env` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"..."}
```

**Note:** For production, consider using Google Cloud Secret Manager or similar for the service account key.

## MongoDB Atlas Setup

### Step 1: Create Atlas Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster or use existing one
3. Create a database user with read/write permissions
4. Whitelist your application's IP addresses

### Step 2: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<username>`, `<password>`, and `<dbname>` with your values

### Step 3: Update Environment
```bash
# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/universal-credit-dev?retryWrites=true&w=majority
```

## API Endpoints

### FCM Token Management

#### Register FCM Token
```http
POST /api/v1/users/fcm-token
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "token": "fcm-token-string",
  "deviceType": "web"
}
```

#### Remove FCM Token
```http
DELETE /api/v1/users/fcm-token
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "token": "fcm-token-string"
}
```

#### Test Notification
```http
POST /api/v1/users/test-notification
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Test Notification",
  "body": "This is a test message",
  "data": {
    "action": "test"
  }
}
```

## Frontend Integration

### Web Push Setup
```javascript
// Initialize Firebase in your frontend
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Get FCM token
async function getFCMToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'your-vapid-key'
    });
    
    // Send token to your backend
    await fetch('/api/v1/users/fcm-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        deviceType: 'web'
      })
    });
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
}
```

### Handle Foreground Messages
```javascript
import { onMessage } from 'firebase/messaging';

onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  
  // Display notification
  if (payload.notification) {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: payload.notification.image
    });
  }
});
```

## Notification Templates

The service includes several built-in notification templates:

- **Welcome Notification**: Sent when user registers
- **KYC Approval**: Sent when identity verification is approved
- **Transaction**: Sent for UC transfers and payments
- **Payment Success**: Sent when Stripe payment completes
- **Security Alerts**: Sent for login/security events

## Background Jobs

Notifications are processed asynchronously using Bull queues:

```javascript
// Send single notification
await workerService.addJob('notifications', 'send-push-notification', {
  userId: user._id,
  notification: {
    title: 'Welcome!',
    body: 'Thanks for joining Universal Credit'
  },
  data: {
    type: 'welcome',
    userId: user._id.toString()
  }
});

// Send bulk notification
await workerService.addJob('notifications', 'send-bulk-push-notification', {
  userIds: [userId1, userId2, userId3],
  notification: {
    title: 'System Update',
    body: 'The system will be updated tonight'
  }
});
```

## Token Cleanup

The system automatically:
- Removes invalid/expired tokens when sending fails
- Keeps only the 5 most recent tokens per user
- Filters out tokens older than 60 days

## Security Notes

1. **Service Account Key**: Store securely, never commit to version control
2. **FCM Tokens**: Hidden from JSON responses for security
3. **User Preferences**: Respect user notification preferences
4. **Rate Limiting**: Built-in rate limiting on notification endpoints

## Testing

1. Set up Firebase project and get service account key
2. Configure environment variables
3. Start the application with valid MongoDB Atlas connection
4. Register an FCM token via the API
5. Send a test notification

## Troubleshooting

### Common Issues

1. **"Firebase not initialized"**: Check service account key format
2. **"Invalid registration token"**: Token expired or invalid, will be auto-removed
3. **Database connection failed**: Check MongoDB Atlas connection string and IP whitelist
4. **Permission denied**: Ensure FCM is enabled in Firebase project

### Monitoring

Check application logs for:
- Firebase initialization status
- Notification delivery success/failure
- Invalid token cleanup
- Database connection status

## Migration from Web Push

If migrating from existing web push implementation:
1. Users will need to re-register for notifications
2. Update frontend to use Firebase SDK
3. Remove old VAPID configuration
4. Test notification delivery thoroughly