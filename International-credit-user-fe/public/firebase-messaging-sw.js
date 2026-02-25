// Firebase messaging service worker
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// Firebase configuration - using credit-50142 project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, // You need to get this from Firebase Console
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID, // You need to get this from Firebase Console
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: payload.notification?.icon || "/icons/UC-192-192.png",
    badge: "/icons/UC-96-96.png",
    tag: payload.data?.tag || "default",
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "Open App",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  if (event.action === "open" || !event.action) {
    // Open the app
    event.waitUntil(clients.openWindow("/"));
  }
  // 'dismiss' action just closes the notification (already handled above)
});
