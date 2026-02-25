import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * PublicRoute component for routes that should only be accessible when not authenticated
 * Redirects authenticated users to the main app (or specified route)
 */
export const PublicRoute = ({ children, redirectTo = "/" }: PublicRouteProps) => {
  const { isAuthenticated } = useAuth();

  // If authenticated, redirect to main app
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // If not authenticated, render the public component (login, register, etc.)
  return <>{children}</>;
};
