/**
 * Route configuration and utilities
 */

// Public routes (no authentication required)
export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/otp-verification",
  "/reset-password",
] as const;

// Private routes (authentication required)
export const PRIVATE_ROUTES = [
  "/",
  "/governance",
  "/governance/proposal/:id",
  "/reserves",
  "/profile",
] as const;

// Route type definitions
export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
export type PrivateRoute = (typeof PRIVATE_ROUTES)[number];

/**
 * Check if a route is public (doesn't require authentication)
 */
export const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTES.some((route) => {
    // Handle exact match
    if (route === path) return true;

    // Handle dynamic routes (basic pattern matching)
    const routePattern = route.replace(/:[^/]+/g, "[^/]+");
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(path);
  });
};

/**
 * Check if a route is private (requires authentication)
 */
export const isPrivateRoute = (path: string): boolean => {
  return !isPublicRoute(path);
};

/**
 * Get the default redirect route for authenticated users
 */
export const getDefaultAuthenticatedRoute = (): string => "/";

/**
 * Get the default redirect route for unauthenticated users
 */
export const getDefaultUnauthenticatedRoute = (): string => "/login";
