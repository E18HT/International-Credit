import React, { useState } from "react";
import { Shield, QrCode, Key, AlertTriangle, CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  useSetup2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useGet2FAStatusQuery,
} from "../store/api/profileApiSlice";

const TwoFactorAuth = () => {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [qrCodeData, setQrCodeData] = useState(null);

  // API hooks
  const { data: twoFAStatus, isLoading: isLoadingStatus } =
    useGet2FAStatusQuery();
  const [setup2FA, { isLoading: isSettingUp }] = useSetup2FAMutation();
  const [enable2FA, { isLoading: isEnabling }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: isDisabling }] = useDisable2FAMutation();
  const isEnabled = twoFAStatus?.data?.isEnabled || false;

  /**
   * Initiates 2FA setup process
   * Fetches QR code and secret from server for authenticator app pairing
   * Opens dialog to display QR code for scanning
   */
  const handleSetup2FA = async () => {
    try {
      const result = await setup2FA().unwrap();
      // Store QR code data (includes QR code image, secret, and backup codes)
      setQrCodeData(result.data);
      setShowSetupDialog(true);
    } catch (error) {
      // Error handled by baseQuery
    }
  };

  /**
   * Enables 2FA after user verifies with authenticator app
   * Requires 6-digit code from authenticator app to confirm setup
   * Clears setup data after successful enablement
   */
  const handleEnable2FA = async () => {
    try {
      await enable2FA({
        token: verificationToken, // 6-digit code from authenticator app
      }).unwrap();

      setShowSetupDialog(false);
      setVerificationToken("");
      setQrCodeData(null);
    } catch (error) {
      // Error handled by baseQuery
    }
  };

  /**
   * Disables 2FA for the user account
   * Requires current password and verification code for security
   * Prevents unauthorized 2FA removal
   */
  const handleDisable2FA = async () => {
    if (!password) return;

    try {
      await disable2FA({
        currentPassword: password, // Verify user identity
        token: verificationToken, // 6-digit code from authenticator app
      }).unwrap();

      setShowDisableDialog(false);
      setPassword("");
      setVerificationToken("");
    } catch (error) {
      // Error handled by baseQuery
    }
  };

  if (isLoadingStatus) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-4">
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-white/50 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-white/50 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-white/50 rounded w-1/4 "></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center font-poppins font-semibold text-gray-800 dark:text-gray-100">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
              isEnabled ? "bg-green-900/10" : "bg-orange-900/10"
            }`}
          >
            <Shield
              className={`h-4 w-4 ${
                isEnabled ? "text-green-600" : "text-orange-600"
              }`}
            />
          </div>
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Label className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
                2FA Status
              </Label>
              <Badge
                className={
                  isEnabled
                    ? "bg-green-100 text-green-800"
                    : "bg-orange-100 text-orange-800"
                }
              >
                {isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-caption text-gray-500 font-inter mt-1">
              {isEnabled
                ? "Your account is protected with two-factor authentication"
                : "Add an extra layer of security to your account"}
            </p>
          </div>

          {!isEnabled ? (
            <Button
              onClick={() => {
                if (twoFAStatus?.data?.setupCompleted) {
                  setShowSetupDialog(true);
                } else {
                  handleSetup2FA();
                }
              }}
              disabled={isSettingUp}
              className="bg-ic-blue hover:bg-ic-blue-light text-white"
            >
              {twoFAStatus?.data?.setupCompleted
                ? "Enable 2FA"
                : isSettingUp
                ? "Setting up..."
                : "Enable 2FA"}
            </Button>
          ) : (
            <Dialog
              open={showDisableDialog}
              onOpenChange={setShowDisableDialog}
            >
              <DialogTrigger asChild>
                <Button variant="destructive">Disable 2FA</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    Disable Two-Factor Authentication
                  </DialogTitle>
                  <DialogDescription>
                    This will make your account less secure. Please confirm your
                    password and enter a verification code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="disable-password">Current Password</Label>
                    <Input
                      id="disable-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="disable-token">Verification Code</Label>
                    <Input
                      id="disable-token"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      placeholder="Enter 6-digit code from your app"
                      maxLength={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDisableDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                    disabled={isDisabling || !password || !verificationToken}
                  >
                    {isDisabling ? "Disabling..." : "Disable 2FA"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* 2FA Setup Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {twoFAStatus?.data?.setupCompleted ? (
                  <>
                    <Key className="h-5 w-5 text-ic-blue mr-2" />
                    Enable 2FA
                  </>
                ) : (
                  <>
                    <QrCode className="h-5 w-5 text-ic-blue mr-2" />
                    Set up Two-Factor Authentication
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {twoFAStatus?.data?.setupCompleted ? (
                  "Enter the verification code to enable 2FA"
                ) : (
                  <>
                    Scan this QR code with your authenticator app, then enter
                    the verification code.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {twoFAStatus?.data?.setupCompleted ? (
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            ) : (
              <>
                {qrCodeData && (
                  <div className="space-y-4">
                    {/* QR Code Display */}
                    <div className="flex justify-center p-4 bg-white border rounded-lg">
                      {qrCodeData.qrCode ? (
                        <img
                          src={qrCodeData.qrCode}
                          alt="2FA QR Code"
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                          <QrCode className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Manual Setup */}
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Manual setup key:</strong>
                        <br />
                        <code className="text-sm bg-gray-100 px-1 rounded">
                          {qrCodeData.secret}
                        </code>
                      </AlertDescription>
                    </Alert>

                    {/* Verification */}
                    <div>
                      <Label htmlFor="verification-code">
                        Verification Code
                      </Label>
                      <Input
                        id="verification-code"
                        value={verificationToken}
                        onChange={(e) => setVerificationToken(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                      />
                    </div>

                    {/* Backup Codes */}
                    {qrCodeData.backupCodes &&
                      qrCodeData.backupCodes.length > 0 && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Backup codes (save these safely):</strong>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs font-mono">
                              {qrCodeData.backupCodes.map((code, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-100 px-2 py-1 rounded"
                                >
                                  {code}
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSetupDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnable2FA}
                disabled={isEnabling || !verificationToken}
                className="bg-ic-blue hover:bg-ic-blue-light text-white"
              >
                {isEnabling ? "Enabling..." : "Enable 2FA"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TwoFactorAuth;
