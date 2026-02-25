import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-error text-white p-3 z-50 shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="ic-body-small font-medium">
          You're offline - Some features may be limited
        </span>
      </div>
    </div>
  );
};
