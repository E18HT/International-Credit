import { QrCode, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { WalletConnect } from "@/components/WalletConnect";
import { useNavigate } from "react-router-dom";
import BalanceBox from "@/components/wallePage/BalanceBox";
import { RecentTransaction } from "@/components/wallePage/RecentTransaction";
import KYCStatusBadge from "@/components/KYC/KYCStatusBadge";
import { useAppSelector } from "@/hooks/useRedux";
import { RootState } from "@/store/store";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useEffect } from "react";

export const WalletPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const { isConnected } = useAccount();
  useEffect(() => {
    if (user?.email) {
      // Ask for notification permission on Home page load
      if ("Notification" in window) {
        if (
          Notification.permission === "default" ||
          Notification.permission === "denied"
        ) {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              console.log("Notification permission granted!");
            } else {
              console.log("Notification permission denied.");
            }
          });
        }
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="International Credit"
        subtitle="Global financial inclusion through blockchain"
      />

      <div className="sm:px-6 px-2 -mt-4 max-w-md mx-auto">
        {/* Balance Card */}
        <Card className="mb-6 ic-card-elevated bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 dark:text-white/90 text-black">
          <CardContent className="sm:px-5 px-2 py-0 text-center flex flex-col gap-2">
            <WalletConnect />
            {user?.identity.adminApproval.status === "approved" &&
              user.identityStatus === "VERIFIED" && <BalanceBox />}
            <KYCStatusBadge />
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {user?.identity.adminApproval.status === "approved" &&
          user.identityStatus === "VERIFIED" && <RecentTransaction />}

        {/* Quick Actions */}
        {user?.identity.adminApproval.status === "approved" &&
          user.identityStatus === "VERIFIED" && (
            <Card className="shadow-card">
              <CardContent className="sm:p-6 p-2">
                <h3 className="font-semibold mb-4">Quick Actions</h3>

                <div className="grid grid-cols-1 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col gap-2"
                    onClick={() => {
                      if (isConnected) {
                        navigate("/stake");
                      } else {
                        toast.error("Please connect your wallet to stake");
                      }
                    }}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">Stake IC</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
};
