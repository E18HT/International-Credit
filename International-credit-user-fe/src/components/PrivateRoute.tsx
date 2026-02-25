import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * PrivateRoute component that protects routes requiring authentication
 * Redirects to login if user is not authenticated
 */
export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, isLoadingUser } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // If authenticated, render the protected component
  return <>{children}</>;
};
