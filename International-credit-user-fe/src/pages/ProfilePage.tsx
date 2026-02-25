import {
  Settings,
  Bell,
  HelpCircle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { LogoutButton } from "@/components/LogoutButton";
import { useAppSelector } from "@/hooks/useRedux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/store/store";
import { formatDate } from "date-fns";
import { formatAddress } from "@/lib/utils";

export const ProfilePage = () => {
  // const user = useAppSelector((state) => state.user);
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const settingsItems = [
    { icon: Settings, label: "Account Settings", href: "/profile/settings" },
    { icon: Bell, label: "Notifications", href: "/profile/notifications" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  const handleSettingsClick = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Profile & Settings" subtitle="Manage your account" />

      <div className="px-6 -mt-4 max-w-md mx-auto">
        {/* User Profile */}
        <Card className="mb-6 shadow-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                {user.kycStatus === "approved" && (
                  <Badge className="bg-success text-success-foreground mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    KYC Approved
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Wallet Address:</span>
                <span className="font-mono text-sm">
                  {formatAddress(user?.wallets[0]?.address)}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Joined Since:</span>
                <span className="font-medium">
                  {formatDate(user?.createdAt, "Pp")}
                </span>
              </div>

              {/* <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">ICGOVT Holdings:</span>
                <span className="font-medium">
                  {user?.ucgtHoldings?.toLocaleString()} ICGOVT
                </span>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <div className="space-y-3">
          {settingsItems.map(({ icon: Icon, label, href }) => (
            <Card key={label} className="shadow-card">
              <CardContent className="p-0">
                <button
                  onClick={() => handleSettingsClick(href)}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          ))}
          <LogoutButton variant="outline" size="default">
            Sign Out
          </LogoutButton>
        </div>
      </div>
    </div>
  );
};
