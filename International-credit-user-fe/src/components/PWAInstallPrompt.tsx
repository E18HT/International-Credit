import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt variable, since it can only be used once
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 dark:bg-card dark:border-gray-500 dark:text-white bg-white border border-gray-200 rounded-xl shadow-elevated p-6 z-50 md:left-auto md:right-4 md:max-w-sm ic-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-ic-blue" />
          <h3 className="ic-heading-3 dark:text-gray-300 text-gray-900">
            Install IC Wallet
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="ic-body-small dark:text-gray-400 text-gray-600 mb-4">
        Install International Credit Wallet for a better experience with offline
        access, faster loading, and native app functionality.
      </p>
      <div className="flex gap-3">
        <Button
          onClick={handleInstallClick}
          className="flex-1 ic-button-primary bg-ic-blue hover:bg-ic-blue-light text-white"
          size="sm"
        >
          Install
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
          size="sm"
        >
          Not now
        </Button>
      </div>
    </div>
  );
};
