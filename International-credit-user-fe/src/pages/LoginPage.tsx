import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { clearError, initializeAuth } from "@/store/slices/authSlice";
import {
  useLoginMutation,
  useVerify2FALoginMutation,
} from "@/store/api/authApi";
import { toast } from "sonner";
import logo from "../assets/IC_logo_square-tr.png";
import { disconnect } from "@wagmi/core";
import { config as wagmiConfig } from "@/lib/wagmi";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  twoFactorCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { error, isAuthenticated, requiresTwoFactor, tempAuthData } =
    useAppSelector((state) => state.auth);

  // Get the return URL from location state (set by PrivateRoute)
  const from = location.state?.from?.pathname || "/";

  // RTK Query hooks for login mutations
  const [login, { isLoading }] = useLoginMutation();
  const [verify2FALogin, { isLoading: isVerifying2FA }] =
    useVerify2FALoginMutation();

  // RHF setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      twoFactorCode: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Initialize auth on component mount
  useEffect(() => {
    dispatch(initializeAuth());
    dispatch(clearError());
  }, [dispatch]);

  // Set 2FA visibility based on requiresTwoFactor state
  useEffect(() => {
    setShowTwoFactor(requiresTwoFactor);
  }, [requiresTwoFactor]);

  const disconnectHandle = async () => {
    await disconnect(wagmiConfig);
  };

  // Redirect to return URL if already authenticated
  useEffect(() => {
    if (isAuthenticated && !requiresTwoFactor) {
      navigate(from, { replace: true });
    }
    disconnectHandle();
  }, [isAuthenticated, requiresTwoFactor, navigate, from]);

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleLogin = handleSubmit(async (values) => {
    const { email, password } = values;

    // If 2FA is required, handle 2FA verification
    if (showTwoFactor) {
      const code = (values.twoFactorCode || twoFactorCode || "").trim();
      if (!/^\d{6}$/.test(code)) {
        toast.error("Please enter a valid 6-digit 2FA code");
        return;
      }
      try {
        const result = await verify2FALogin({
          email,
          password,
          twoFactorToken: code,
        }).unwrap();
        if (result?.status === "success") {
          toast.success(result.message || "Login successful!");
        }
      } catch (error: unknown) {
        let errorMessage = "2FA verification failed";
        if (error && typeof error === "object") {
          const apiError = error as {
            data?: { message?: string };
            message?: string;
          };
          errorMessage =
            apiError.data?.message ||
            apiError.message ||
            "2FA verification failed";
        }
        toast.error(errorMessage);
        console.error("2FA verification error:", error);
      }
      return;
    }

    // Initial login attempt
    try {
      const result = await login({ email, password }).unwrap();
      if (result?.status === "success") {
        if (!result?.requiresTwoFactor) {
          toast.success(result.message || "Login successful!");
          navigate(from, { replace: true });
        }
      }
    } catch (error: unknown) {
      let errorMessage = "Login failed";
      if (error && typeof error === "object") {
        const apiError = error as {
          data?: { message?: string };
          message?: string;
        };
        errorMessage =
          apiError.data?.message || apiError.message || "Login failed";
      }
      toast.error(errorMessage);
      console.error("Login error:", error);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary-light/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img
              src={logo}
              alt="International Credit Logo"
              className=" mx-auto rounded-lg "
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your International Credit Wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                required
              />
              {errors.email?.message ? (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password?.message ? (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            {showTwoFactor && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Two Factor Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  {...register("twoFactorCode", {
                    validate: (val) =>
                      !showTwoFactor ||
                      /^\d{6}$/.test(val || "") ||
                      "Enter a valid 6-digit code",
                    onChange: (e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setValue("twoFactorCode", digits, {
                        shouldValidate: true,
                      });
                    },
                  })}
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
                {errors.twoFactorCode?.message ? (
                  <p className="text-xs text-red-500 text-center">
                    {errors.twoFactorCode.message}
                  </p>
                ) : null}
              </div>
            )}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isVerifying2FA}
            >
              {isLoading || isVerifying2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {showTwoFactor ? "Verifying 2FA..." : "Signing In..."}
                </>
              ) : showTwoFactor ? (
                "Verify & Sign In"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
