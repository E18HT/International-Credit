import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useVerifyEmailMutation } from "@/store/api/authApi";
import { toast } from "sonner";

export const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [verifyEmail, { isLoading, error, isSuccess }] =
    useVerifyEmailMutation();
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  useEffect(() => {
    if (token) {
      handleEmailVerification();
    } else {
      setVerificationStatus("error");
    }
  }, [token]);

  const handleEmailVerification = async () => {
    if (!token) return;

    try {
      setVerificationStatus("loading");
      const response = await verifyEmail(token).unwrap();

      if (response.status === "success") {
        setVerificationStatus("success");
        toast.success("Email verified successfully!");

        // Redirect to home page after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setVerificationStatus("error");
        toast.error(response.message || "Email verification failed");
      }
    } catch (error: any) {
      setVerificationStatus("error");
      console.error("Email verification error:", error);
      toast.error(
        error.data?.message || error.message || "Email verification failed"
      );
    }
  };

  const handleRetry = () => {
    if (token) {
      handleEmailVerification();
    }
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {verificationStatus === "loading" && (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              )}
              {verificationStatus === "success" && (
                <CheckCircle className="w-8 h-8 text-green-500" />
              )}
              {verificationStatus === "error" && (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
            <CardTitle className="text-xl">
              {verificationStatus === "loading" && "Verifying Email..."}
              {verificationStatus === "success" && "Email Verified!"}
              {verificationStatus === "error" && "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {verificationStatus === "loading" &&
                "Please wait while we verify your email address"}
              {verificationStatus === "success" &&
                "Your email has been successfully verified"}
              {verificationStatus === "error" &&
                "There was an error verifying your email"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {verificationStatus === "loading" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Verifying your email address. This may take a few moments...
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus === "success" && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Your email has been successfully verified! You will be
                  redirected to the home page shortly.
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus === "error" && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error?.data?.message ||
                    error?.message ||
                    "Failed to verify email. The link may be expired or invalid."}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {verificationStatus === "error" && (
                <Button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    "Try Again"
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleGoHome}
                className="flex-1"
              >
                Go to Home
              </Button>
            </div>

            {verificationStatus === "success" && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Redirecting to home page in a few seconds...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
