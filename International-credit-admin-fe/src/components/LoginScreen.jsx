import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  useLoginMutation,
  useVerify2FALoginMutation,
} from "../store/api/apiSlice";
import {
  loginSuccess,
  loginFailure,
  clearError,
} from "../store/slices/authSlice";
import logo from "../assets/IC_logo-removebg.png";
const LoginScreen = () => {
  const dispatch = useDispatch();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [verify2FALogin, { isLoading: is2FAVerifying }] =
    useVerify2FALoginMutation();

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    role: "super_admin",
    mfaCode: "",
  });
  const [step, setStep] = useState("credentials");
  const [temporaryToken, setTemporaryToken] = useState("");

  // Clear errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Handles credential-based login submission
   * If 2FA is enabled, stores temporary token and switches to MFA step
   * Otherwise, dispatches login success and stores auth data in Redux
   */
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const result = await login({
        email: credentials.email,
        password: credentials.password,
      }).unwrap();

      // Check if user has 2FA enabled - requires additional verification step
      if (result.requiresTwoFactor) {
        // Store temporary token received from server for 2FA verification
        // This token is required to complete login after MFA code validation
        setTemporaryToken(result.data.temporaryToken);
        setStep("mfa");
        toast.error("Please enter your 2FA code to continue");
      } else {
        // User doesn't have 2FA enabled - complete login immediately
        dispatch(
          loginSuccess({
            user: result.data.user,
            token: result.data.tokens.accessToken,
            role: result.data.user.role,
          })
        );
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error(error.data?.message || "Login failed");
      dispatch(loginFailure(error.data?.message || "Login failed"));
    }
  };

  /**
   * Handles 2FA code verification
   * Validates 6-digit code and temporary token before submitting
   * On success, completes login and stores auth data in Redux
   */
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.mfaCode || credentials.mfaCode.length !== 6) {
      toast.error("Please enter a valid 6-digit MFA code");
      return;
    }

    // Validate temporary token exists (prevents expired session issues)
    if (!temporaryToken) {
      toast.error("Session expired. Please login again.");
      setStep("credentials");
      return;
    }

    try {
      // Verify 2FA code with server using temporary token from initial login
      const result = await verify2FALogin({
        email: credentials.email,
        password: credentials.password,
        twoFactorToken: credentials.mfaCode,
      }).unwrap();

      // Complete login after successful 2FA verification
      dispatch(
        loginSuccess({
          user: result.data.user,
          token: result.data.tokens.accessToken,
          role: result.data.user.role,
        })
      );

      toast.success("2FA verification successful!");
      // Navigation will be handled by the ProtectedRoute component
    } catch (error) {
      dispatch(loginFailure(error.data?.message || "2FA verification failed"));
      toast.error(error.data?.message || "2FA verification failed");
      // Clear MFA code on error to allow retry
      setCredentials({ ...credentials, mfaCode: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ic-blue to-ic-blue-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="logo" className="w-full h-full" />
        </div>

        {/* Login Form */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl justify-center flex items-center font-poppins font-semibold">
              {step === "credentials" && " Login"}
              {step === "mfa" && "Multi-Factor Authentication"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "credentials" && (
              <form onSubmit={handleCredentialSubmit} className="space-y-4">
                <div>
                  <Label
                    htmlFor="email"
                    className="text-white/80 font-inter font-medium"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) =>
                      setCredentials({ ...credentials, email: e.target.value })
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-ic-gold focus:ring-ic-gold/20"
                    placeholder="admin@internationalcredit.com"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-white/80 font-inter font-medium"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.target.value,
                      })
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-ic-gold focus:ring-ic-gold/20"
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoginLoading}
                >
                  {isLoginLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            )}

            {step === "mfa" && (
              <div className="space-y-4">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-ic-gold mx-auto mb-2" />
                  <p className="text-white/80 text-sm font-inter">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <div>
                    <Label
                      htmlFor="mfaCode"
                      className="text-white/80 font-inter font-medium"
                    >
                      MFA Code
                    </Label>
                    <Input
                      id="mfaCode"
                      type="text"
                      value={credentials.mfaCode}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          mfaCode: e.target.value,
                        })
                      }
                      className="bg-white/10 border-white/20 text-white text-center text-lg tracking-widest focus:border-ic-gold focus:ring-ic-gold/20"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-ic-gold hover:bg-ic-gold/90 text-ic-blue font-inter font-semibold"
                      disabled={is2FAVerifying}
                    >
                      {is2FAVerifying ? "Verifying..." : "Verify & Login"}
                    </Button>
                  </div>
                </form>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("credentials");
                    setTemporaryToken("");
                    setCredentials({ ...credentials, mfaCode: "" });
                  }}
                  className="w-full text-white/60 hover:text-white/80 font-inter"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;
