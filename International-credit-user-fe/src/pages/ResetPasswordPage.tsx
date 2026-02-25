import { useState, useEffect } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { useResetPasswordMutation } from "@/store/api/authApi";
import { toast } from "sonner";
import logo from "../assets/IC_logo_square-tr.png";

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // RTK Query hook for reset password
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  // Extract token from URL params or session storage
  useEffect(() => {
    const urlToken = searchParams.get("token");
    const sessionToken = sessionStorage.getItem("resetToken");

    if (token) {
      return;
    } else {
      toast.error("Invalid or missing reset token");
      navigate("/forgot-password");
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      const result = await resetPassword({
        token,
        password: formData.password,
      }).unwrap();

      if (result.status === "success") {
        toast.success(result.message || "Password reset successfully!");
        // Clear session storage
        sessionStorage.removeItem("resetToken");
        sessionStorage.removeItem("resetEmail");
        // Navigate to login
        navigate("/login");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to reset password";

      if (error && typeof error === "object") {
        const apiError = error as {
          data?: { message?: string };
          message?: string;
        };
        errorMessage =
          apiError.data?.message ||
          apiError.message ||
          "Failed to reset password";
      }

      toast.error(errorMessage);
      console.error("Reset password error:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary-light/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img
              src={logo}
              alt="International Credit Logo"
              className="mx-auto rounded-lg"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  required
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && (
                <p
                  className={`text-sm ${
                    passwordsMatch ? "text-success" : "text-destructive"
                  }`}
                >
                  {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Password requirements:
              </p>
              <ul className="text-xs  space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains at least one uppercase letter</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordsMatch || !formData.password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
