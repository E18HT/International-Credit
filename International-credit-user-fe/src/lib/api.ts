import {
  isRejectedWithValue,
  Middleware,
  MiddlewareAPI,
  AnyAction,
} from "@reduxjs/toolkit";
import { disconnect } from "@wagmi/core";
import { config as wagmiConfig } from "@/lib/wagmi";

// API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  ENDPOINTS: {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      REFRESH: "/auth/refresh",
      LOGOUT: "/auth/logout",
      FORGOT_PASSWORD: "/auth/forgot-password",
      RESET_PASSWORD: "/auth/reset-password",
      CHANGE_PASSWORD: "/auth/change-password",
    },
    WALLETS: {
      LINK: "/wallets/link",
      WALLETS: "/wallets",
    },
  },
};

// Token management utilities
export const tokenUtils = {
  getAccessToken: () => localStorage.getItem("accessToken"),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
  isTokenExpired: (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },
};

// Check for known global errors and handle them
const checkForKnownGlobalErrors = (
  payload: { status?: number } | undefined | null,
  dispatch: MiddlewareAPI["dispatch"]
): boolean => {
  // Handle 401 Unauthorized errors
  if (payload?.status === 401) {
    console.warn(
      "🔒 401 Unauthorized - clearing tokens and redirecting to login"
    );

    // Clear tokens
    tokenUtils.clearTokens();

    // Disconnect wallet session (ignore errors)
    try {
      void disconnect(wagmiConfig);
    } catch (e) {
      console.warn("Wallet disconnect failed (ignored)", e);
    }

    // Redirect to login
    const loginUrl = `/login`;
    window.location.href = loginUrl;

    return true;
  }

  // Handle other global errors as needed
  if (payload?.status >= 500) {
    console.error("🚨 Server error:", payload);
    // Could dispatch a global error notification here
    return false; // Don't prevent the error from being handled by components
  }

  return false;
};

export const rtkQueryGlobalErrorMiddleware: Middleware =
  (api: MiddlewareAPI) => (next) => (action: AnyAction) => {
    const actionType = action.type;
    // rejected action
    if (isRejectedWithValue(action)) {
      const hasKnownGlobalErrors = checkForKnownGlobalErrors(
        action.payload,
        api.dispatch
      );
      // has known global error and has dispatched some state that causes an error to be shown to the user
      if (hasKnownGlobalErrors) {
        // I don't want to call the next action because that causes a 'rejected' state
        // my more specific error handling will be triggered per-component and cause more than one error to be shown to the user for the same thing.
        // If I don't return anything, loading state will be indefinite.
        const actionTypeWithoutStatus = actionType.substring(
          0,
          actionType.lastIndexOf("/")
        );

        // RTK Query actions are of form `api/action/status` so modify the returned action status
        return next({
          ...action,
          type: `${actionTypeWithoutStatus}/fulfilled`,
        });
      }
    }

    return next(action);
  };
