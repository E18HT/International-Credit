import React, { useState } from "react";
import { Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import {
  useDisable2FAMutation,
  useEnable2FAMutation,
  useSetup2FAMutation,
} from "@/store/api/userProfileApi";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useAppSelector } from "@/hooks/useRedux";
import { useCurrentUser } from "@/hooks/useAuth";
import { updateUser } from "@/store/slices/authSlice";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
const TwoFA = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [is2FAEnabled, setIs2FAEnabled] = useState(
    user?.twoFactor?.isEnabled || false
  );
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [password, setPassword] = useState("");
  const [setupResult, setSetupResult] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [openQrCode, setOpenQrCode] = useState(false);
  const [openDisableDialog, setOpenDisableDialog] = useState(false);
  const [openEnableDialog, setOpenEnableDialog] = useState(false);
  const [setup2FA, { isLoading }] = useSetup2FAMutation();
  const [enable2FA, { isLoading: isEnabling2FA }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const dispatch = useDispatch();
  const handleSetup2FA = async () => {
    try {
      const result = await setup2FA().unwrap();
      if (result.status === "success") {
        // Display QR code to user
        setOpenQrCode(true);
        // Handle verification flow
        setSetupResult(result.data);
      }
    } catch (error) {
      console.error("2FA setup failed:", error);
    }
  };

  const handleVerify2FA = async () => {
    try {
      if (twoFactorCode.length !== 6) {
        toast.error("Invalid 2FA code", {
          description: "Please enter a valid 2FA code",
        });
        return;
      }
      const result = await enable2FA({ token: twoFactorCode }).unwrap();
      if (result?.status === "success") {
        toast.success(result.data.message);
        dispatch(
          updateUser({
            ...user,
            twoFactor: {
              ...user.twoFactor,
              isEnabled: true,
              setupCompleted: true,
            },
          })
        );
        setOpenQrCode(false);
        setIs2FAEnabled(true);
        setTwoFactorCode("");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
    }
  };
  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      // For enabling, show OTP dialog if already setup, otherwise setup
      if (user?.twoFactor?.setupCompleted) {
        setOpenEnableDialog(true);
      } else {
        handleSetup2FA();
      }
    } else {
      // For disabling, show password confirmation dialog
      setOpenDisableDialog(true);
    }
  };

  const handleDisable2FA = async () => {
    try {
      if (!password || !twoFactorCode) {
        toast.error("Missing information", {
          description: "Please enter both password and 2FA code",
        });
        return;
      }

      const result = await disable2FA({
        currentPassword: password,
        token: twoFactorCode,
      }).unwrap();

      if (result?.status === "success") {
        toast.success(result?.data?.message);
        dispatch(
          updateUser({
            ...user,
            twoFactor: {
              ...user.twoFactor,
              isEnabled: false,
            },
          })
        );
        setIs2FAEnabled(false);
        setOpenDisableDialog(false);
        setPassword("");
        setTwoFactorCode("");
      }
    } catch (error) {
      console.error("2FA disable failed:", error);
      toast.error("Failed to disable 2FA", {
        description: "Please check your password and 2FA code",
      });
    }
  };

  const handleEnable2FA = async () => {
    try {
      if (twoFactorCode.length !== 6) {
        toast.error("Invalid 2FA code", {
          description: "Please enter a valid 6-digit 2FA code",
        });
        return;
      }

      const result = await enable2FA({ token: twoFactorCode }).unwrap();
      if (result?.status === "success") {
        toast.success(result?.data?.message);
        dispatch(
          updateUser({
            ...user,
            twoFactor: {
              ...user.twoFactor,
              isEnabled: true,
            },
          })
        );
        setIs2FAEnabled(true);
        setOpenEnableDialog(false);
        setTwoFactorCode("");
      }
    } catch (error) {
      console.error("2FA enable failed:", error);
      toast.error("Failed to enable 2FA", {
        description: "Please check your 2FA code",
      });
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">Two-Factor Authentication</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Enable 2FA</p>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>
        {user?.twoFactor?.setupCompleted && (
          <Switch
            checked={is2FAEnabled}
            disabled={isDisabling2FA || isEnabling2FA}
            onCheckedChange={handle2FAToggle}
          />
        )}
      </div>
      {!user?.twoFactor?.setupCompleted && (
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleSetup2FA}
        >
          {isLoading ? "Setting up 2FA..." : "Setup 2FA"}
        </Button>
      )}

      {is2FAEnabled && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              2FA is enabled
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Your account is protected with two-factor authentication
          </p>
        </div>
      )}
      {/* Setup 2FA Dialog (QR Code) */}
      <Dialog open={openQrCode} onOpenChange={setOpenQrCode}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Setup 2FA</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app and enter the code to
              complete setup.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <img
                src={setupResult?.qrCode}
                alt="2FA QR Code"
                className="w-48 h-48 m-auto"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="setup-2fa-code">Enter 2FA Code</Label>
              <Input
                id="setup-2fa-code"
                name="setup-2fa-code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={isEnabling2FA || twoFactorCode.length !== 6}
              onClick={handleVerify2FA}
            >
              {isEnabling2FA ? "Verifying..." : "Complete Setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable 2FA Dialog (OTP only) */}
      <Dialog open={openEnableDialog} onOpenChange={setOpenEnableDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enable 2FA</DialogTitle>
            <DialogDescription>
              Enter your 2FA code from your authenticator app to enable
              two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="enable-2fa-code">2FA Code</Label>
              <Input
                id="enable-2fa-code"
                name="enable-2fa-code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenEnableDialog(false);
                setTwoFactorCode("");
                setIs2FAEnabled(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={isEnabling2FA || twoFactorCode.length !== 6}
              onClick={handleEnable2FA}
            >
              {isEnabling2FA ? "Enabling..." : "Enable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog (Password + OTP) */}
      <Dialog open={openDisableDialog} onOpenChange={setOpenDisableDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Disable 2FA</DialogTitle>
            <DialogDescription>
              For security, please enter your password and current 2FA code to
              disable two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="disable-password">Current Password</Label>
              <Input
                id="disable-password"
                name="disable-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="disable-2fa-code">2FA Code</Label>
              <Input
                id="disable-2fa-code"
                name="disable-2fa-code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenDisableDialog(false);
                setPassword("");
                setTwoFactorCode("");
                setIs2FAEnabled(true);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                isDisabling2FA || !password || twoFactorCode.length !== 6
              }
              onClick={handleDisable2FA}
            >
              {isDisabling2FA ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TwoFA;
