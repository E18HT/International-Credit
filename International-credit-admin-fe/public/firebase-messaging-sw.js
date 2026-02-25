// Import Firebase scripts for service worker
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// Firebase configuration - using credit-50142 project
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification?.title || "ICC Admin";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "icc-notification",
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

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  if (event.action === "open" || !event.action) {
    // Open the app
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (
              client.url.includes(self.location.origin) &&
              "focus" in client
            ) {
              return client.focus();
            }
          }
          // If app is not open, open it
          if (clients.openWindow) {
            return clients.openWindow("/");
          }
        })
    );
  }
  // If action is 'dismiss', just close the notification (already done above)
});
