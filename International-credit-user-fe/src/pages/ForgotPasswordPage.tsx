import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useForgotPasswordMutation } from "@/store/api/authApi";
import { toast } from "sonner";
import logo from "../assets/IC_logo_square-tr.png";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  // RTK Query hook for forgot password
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      const result = await forgotPassword({ email }).unwrap();

      if (result.status === "success") {
        toast.success(
          result.message ||
            "Password reset link sent to your email please check your email."
        );
        // Store the reset token and email for the reset password flow
        sessionStorage.setItem("resetToken", result.data.resetToken);
        sessionStorage.setItem("resetEmail", email);

        reset();
        navigate("/login");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to send reset link";

      if (error && typeof error === "object") {
        const apiError = error as {
          data?: { message?: string };
          message?: string;
          status?: string;
        };
        errorMessage =
          apiError.data?.message ||
          apiError.message ||
          "Failed to send reset link";
      }

      toast.error(errorMessage);
      console.error("Forgot password error:", error);
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
              className="mx-auto rounded-lg"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register("email")}
                required
              />
              {errors.email?.message ? (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
