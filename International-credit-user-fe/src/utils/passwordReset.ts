/**
 * Password Reset Utilities
 */

/**
 * Generate a password reset link with token
 * @param baseUrl - The base URL of your frontend application
 * @param token - The reset token from the API
 * @param email - The user's email address
 * @returns Complete reset link URL
 */
export const generatePasswordResetLink = (
  baseUrl: string,
  token: string,
  email: string
): string => {
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
};

/**
 * Extract reset token from URL or session storage
 * @param searchParams - URL search parameters
 * @returns Reset token or null if not found
 */
export const extractResetToken = (
  searchParams: URLSearchParams
): string | null => {
  // First try URL params
  const urlToken = searchParams.get("token");
  if (urlToken) {
    return urlToken;
  }

  // Fallback to session storage
  return sessionStorage.getItem("resetToken");
};

/**
 * Store reset token and email in session storage
 * @param token - Reset token
 * @param email - User email
 */
export const storeResetData = (token: string, email: string): void => {
  sessionStorage.setItem("resetToken", token);
  sessionStorage.setItem("resetEmail", email);
};

/**
 * Clear reset data from session storage
 */
export const clearResetData = (): void => {
  sessionStorage.removeItem("resetToken");
  sessionStorage.removeItem("resetEmail");
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with strength and errors
 */
export const validatePasswordStrength = (password: string) => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  const strength =
    errors.length === 0 ? "strong" : errors.length <= 2 ? "medium" : "weak";

  return {
    isValid: errors.length === 0,
    strength,
    errors,
  };
};

/**
 * Example usage for backend integration:
 *
 * When user requests password reset:
 * 1. Backend generates reset token
 * 2. Backend creates reset link using generatePasswordResetLink()
 * 3. Backend sends email with the reset link
 *
 * Example reset link:
 * https://yourapp.com/reset-password?token=a1b2c3d4e5f6&email=user@example.com
 */
