import React, { useState } from "react";
import { Button } from "../ui/button";
import { Header } from "../Header";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "../ui/switch";
import {
  useRegisterFCMTokenMutation,
  useUpdateNotificationMutation,
} from "@/store/api/userProfileApi";
import { toast } from "sonner";
import { generateFCMToken, onMessageListener } from "@/lib/firebase";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";

const Notification = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState({
    email: user?.preferences.notifications.email,
    push: user?.preferences.notifications.push,
  });

  const [registerFCMToken] = useRegisterFCMTokenMutation();
  const [updateNotification] = useUpdateNotificationMutation();
  // Set up FCM message listener
  React.useEffect(() => {
    if (notifications.push) {
      onMessageListener()
        .then((payload: unknown) => {
          const message = payload as {
            notification?: { title?: string; body?: string };
          };
          toast.success(message.notification?.title || "New Notification", {
            description:
              message.notification?.body || "You have a new notification",
          });
        })
        .catch((err) => console.log("Failed to listen for messages:", err));
    }
  }, [notifications.push]);

  const handleNotificationToggle = async (type: string, checked: boolean) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: checked,
    }));
    if (type === "email" && checked) {
      const result = await updateNotification({ email: checked }).unwrap();

      if (result.status === "success") {
        toast.success("Email notifications enabled");
      } else {
        toast.error("Failed to enable email notifications");
      }
    } else if (type === "email" && !checked) {
      const result = await updateNotification({ email: checked }).unwrap();
      if (result.status === "success") {
        toast.success("Email notifications disabled");
      } else {
        toast.error("Failed to disable email notifications");
      }
    }
    // If enabling push notifications, generate and register FCM token
    if (type === "push" && checked) {
      try {
        toast.loading("Requesting notification permission...");

        const fcmToken = await generateFCMToken();
        if (fcmToken) {
          await registerFCMToken({
            token: fcmToken,
            deviceType: "web",
          }).unwrap();

          toast.dismiss();
          toast.success("Push notifications enabled", {
            description: "You'll now receive push notifications",
          });

          // Set up message listener for this session
          onMessageListener()
            .then((payload: unknown) => {
              const message = payload as {
                notification?: { title?: string; body?: string };
              };
              toast.success(message.notification?.title || "New Notification", {
                description:
                  message.notification?.body || "You have a new notification",
              });
            })
            .catch((err) => console.log("Failed to listen for messages:", err));
        }
      } catch (error: unknown) {
        console.error("Failed to register FCM token:", error);
        toast.dismiss();
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Please check your browser settings and try again";
        toast.error("Failed to enable push notifications", {
          description: errorMessage,
        });
        // Revert the toggle state
        setNotifications((prev) => ({
          ...prev,
          [type]: false,
        }));
      }
    } else if (type === "push" && !checked) {
      const result = await updateNotification({ push: checked }).unwrap();
      if (result.status === "success") {
        toast.success("Push notifications disabled");
      } else {
        toast.error("Failed to disable push notifications");
      }
    }
  };
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Notifications"
        subtitle="Manage your notification preferences"
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        }
      />

      <div className="px-6 mt-6 border-gray-200 rounded-lg border py-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Notification Preferences</h3>
          </div>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications via email
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

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
