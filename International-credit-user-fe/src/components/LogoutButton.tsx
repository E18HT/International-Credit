import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useRedux";
import { logout } from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { disconnect } from "@wagmi/core";
import { config as wagmiConfig } from "@/lib/wagmi";
import { useNavigate } from "react-router-dom";

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const LogoutButton = ({
  variant = "ghost",
  size = "default",
  showIcon = true,
  children = "Logout",
}: LogoutButtonProps) => {
  const dispatch = useAppDispatch();
  const [logoutMutation, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Try server-side logout first (if endpoint exists)
      await logoutMutation().unwrap();
      toast.success("Logged out successfully");
    } catch (error) {
      // If server logout fails, still logout locally
      console.warn("Server logout failed, logging out locally:", error);
    } finally {
      // Always clear local auth state
      dispatch(logout());
      try {
        // Disconnect wallet session
        await disconnect(wagmiConfig);
      } catch (e) {
        console.warn("Wallet disconnect failed (ignored)", e);
      }
      // Navigate to login page
      navigate("/login");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2 w-full hover:bg-primary hover:text-accent-foreground"
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {children}
    </Button>
  );
};
