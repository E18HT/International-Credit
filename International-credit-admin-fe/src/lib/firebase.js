import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration - using credit-50142 project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// VAPID key for web push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn("Firebase messaging not available:", error);
}

// Function to generate FCM token
export const generateFCMToken = async () => {
  if (!messaging) {
    console.warn("Firebase messaging not initialized");
    return null;
  }

  try {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
      throw new Error("This browser doesn't support notifications");
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log("FCM Token generated:", token);
      return token;
    } else {
      throw new Error("No FCM token available");
    }
  } catch (error) {
    console.error("Error generating FCM token:", error);
    throw error;
  }
};

// Function to listen for incoming messages
export const onMessageListener = () => {
  if (!messaging) {
    return Promise.reject("Firebase messaging not initialized");
  }

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received:", payload);
      resolve(payload);
    });
  });
};

export { messaging };
