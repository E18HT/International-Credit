import React, { useState, useEffect } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Bell, Mail } from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Smartphone } from "lucide-react";
import { useUserDetails } from "../../hooks/useUserDetails";
import {
  useRegisterFCMTokenMutation,
  useUpdateNotificationMutation,
} from "../../store/api/userProfileApi";
import { generateFCMToken, onMessageListener } from "../../lib/firebase";

const Notification = () => {
  const { user } = useUserDetails();

  // Notification state
  const [notifications, setNotifications] = useState({
    email: user?.preferences.notifications.email,
    push: user?.preferences.notifications.push,
  });

  // API hooks
  const [registerFCMToken] = useRegisterFCMTokenMutation();
  const [updateNotification] = useUpdateNotificationMutation();

  // Set up FCM message listener
  useEffect(() => {
    if (notifications.push) {
      onMessageListener()
        .then((payload) => {
          const message = payload;
          toast.success(message.notification?.title || "New Notification", {
            description:
              message.notification?.body || "You have a new notification",
          });
        })
        .catch((err) => console.log("Failed to listen for messages:", err));
    }
  }, [notifications.push]);

  /**
   * Handles notification preference toggle (email/push)
   * For push notifications: requests browser permission, generates FCM token,
   * registers token with backend, and sets up message listener
   * Reverts toggle state if push notification setup fails
   */
  const handleNotificationToggle = async (type, checked) => {
    // Optimistically update UI state
    setNotifications((prev) => ({
      ...prev,
      [type]: checked,
    }));

    // Handle email notification toggle
    if (type === "email" && checked) {
      const result = await updateNotification({ email: true }).unwrap();
      if (result.status === "success") {
        toast.success("Email notifications enabled");
      } else {
        toast.error("Failed to enable email notifications");
      }
    } else if (type === "email" && !checked) {
      const result = await updateNotification({ email: false }).unwrap();
      if (result.status === "success") {
        toast.success("Email notifications disabled");
      } else {
        toast.error("Failed to disable email notifications");
      }
    }

    // Handle push notification toggle - requires browser permission and FCM setup
    if (type === "push" && checked) {
      try {
        toast.loading("Requesting notification permission...");

        // Request browser notification permission and generate FCM token
        const fcmToken = await generateFCMToken();

        if (fcmToken) {
          // Register FCM token with backend for push notification delivery
          await registerFCMToken({
            token: fcmToken,
            deviceType: "web",
          }).unwrap();

          toast.dismiss();
          toast.success("Push notifications enabled", {
            description: "You'll now receive push notifications",
          });

          // Set up listener for foreground messages (when app is open)
          // Background messages are handled by service worker
          onMessageListener()
            .then((payload) => {
              const message = payload;
              console.log("Received foreground message:", payload);
              toast.success(message.notification?.title || "New Notification", {
                description:
                  message.notification?.body || "You have a new notification",
              });
            })
            .catch((err) => console.log("Failed to listen for messages:", err));
        }
      } catch (error) {
        console.error("Failed to register FCM token:", error);
        toast.dismiss();
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Please check your browser settings and try again";
        toast.error("Failed to enable push notifications", {
          description: errorMessage,
        });
        // Revert toggle state on failure to maintain UI consistency
        setNotifications((prev) => ({
          ...prev,
          [type]: false,
        }));
      }
    } else if (type === "push" && !checked) {
      // Disable push notifications
      const result = await updateNotification({ push: false }).unwrap();
      if (result.status === "success") {
        toast.success("Push notifications disabled");
      } else {
        toast.error("Failed to disable push notifications");
      }
    }
  };
  return (
    <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center font-poppins font-semibold text-gray-800 dark:text-gray-100">
          <div className="w-8 h-8 bg-ic-gold/10 rounded-lg flex items-center justify-center mr-3">
            <Bell className="h-4 w-4 text-ic-gold" />
          </div>
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
                Email Notifications
              </Label>
              <p className="text-caption text-gray-500 font-inter">
                Receive updates via email
              </p>
            </div>
          </div>
          <Switch
            checked={notifications.email}
            onCheckedChange={(checked) =>
              handleNotificationToggle("email", checked)
            }
          />
        </div>
        {/* <Separator /> */}

        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
                Push Notifications
              </Label>
              <p className="text-caption text-gray-500 font-inter">
                Receive push notifications on your device
              </p>
            </div>
          </div>
          <Switch
            checked={notifications.push}
            onCheckedChange={(checked) =>
              handleNotificationToggle("push", checked)
            }
          />
        </div>
       
      </CardContent>
    </Card>
  );
};

export default Notification;
