import { Bell, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  timeAgo: string;
  unread: boolean;
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Transaction Completed",
    message: "Your IC transfer of 125.50 tokens was successful",
    timeAgo: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    type: "info",
    title: "New Governance Proposal",
    message: "Voting is now open for the staking rewards proposal",
    timeAgo: "1 day ago",
    unread: true,
  },
  {
    id: "3",
    type: "warning",
    title: "Reserve Alert",
    message: "ICBTC collateral ratio approaching threshold",
    timeAgo: "2 days ago",
    unread: false,
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="w-4 h-4 text-success" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-warning" />;
    default:
      return <TrendingUp className="w-4 h-4 text-primary" />;
  }
};

export const NotificationDropdown = () => {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mr-6" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <Button variant="ghost" size="sm" className="text-xs">
              Mark all read
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                  notification.unread ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {notification.title}
                      </p>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {notification.timeAgo}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
