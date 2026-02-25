import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { tokenUtils } from "@/lib/api";
import { authApi } from "@/store/api/authApi";
import type { User, Tokens } from "@/store/api/authApi";

export interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  tempAuthData: {
    email: string;
    tokens: Tokens;
  } | null;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  requiresTwoFactor: false,
  tempAuthData: null,
  error: null,
};

// Helper function to check if user is authenticated
export const checkAuthStatus = () => {
  const token = tokenUtils.getAccessToken();
  return token && !tokenUtils.isTokenExpired(token);
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.requiresTwoFactor = false;
      state.tempAuthData = null;
      state.error = null;

      // Clear tokens using utility function
      tokenUtils.clearTokens();
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      state.user = { ...state.user, ...action.payload };
    },
    initializeAuth: (state) => {
      // Initialize auth state from localStorage
      const token = tokenUtils.getAccessToken();
      const refreshToken = tokenUtils.getRefreshToken();
      if (token && !tokenUtils.isTokenExpired(token)) {
        state.isAuthenticated = true;
        state.tokens = {
          accessToken: token,
          refreshToken: refreshToken || "",
          expiresIn: 86400, // Default value
        };
      } else {
        // Clear expired tokens
        tokenUtils.clearTokens();
        state.isAuthenticated = false;
        state.tokens = null;
      }
    },
    setAuthData: (
      state,
      action: PayloadAction<{ user: User; tokens: Tokens }>
    ) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.requiresTwoFactor = false;
      state.tempAuthData = null;
      state.error = null;
    },
    setRequiresTwoFactor: (
      state,
      action: PayloadAction<{ email: string; tokens: Tokens }>
    ) => {
      state.requiresTwoFactor = true;
      state.tempAuthData = action.payload;
      state.isAuthenticated = false;
      state.error = null;
    },
    completeTwoFactorAuth: (
      state,
      action: PayloadAction<{ user: User; tokens: Tokens }>
    ) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.requiresTwoFactor = false;
      state.tempAuthData = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle RTK Query auth API responses
    builder
      // Register success
      .addMatcher(
        authApi.endpoints.register.matchFulfilled,
        (state, action) => {
          state.user = action.payload.data.user;
          state.tokens = action.payload.data.tokens;
          state.isAuthenticated = true;
          state.error = null;
        }
      )
      // Register error
      .addMatcher(authApi.endpoints.register.matchRejected, (state, action) => {
        state.error = action.error.message || "Registration failed";
        state.isAuthenticated = false;
      })
      // Login success
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        if (action.payload.requiresTwoFactor) {
          // Don't set as authenticated yet, store temp data
          state.requiresTwoFactor = true;
          state.tempAuthData = {
            email: "", // Will be filled from login form
            tokens: action.payload.data.tokens,
          };
          state.isAuthenticated = false;
        } else {
          // Complete authentication
          state.user = action.payload.data.user;
          state.tokens = action.payload.data.tokens;
          state.isAuthenticated = true;
          state.requiresTwoFactor = false;
          state.tempAuthData = null;
        }
        state.error = null;
      })
      // Login error
      .addMatcher(authApi.endpoints.login.matchRejected, (state, action) => {
        state.error = action.error.message || "Login failed";
        state.isAuthenticated = false;
        state.requiresTwoFactor = false;
        state.tempAuthData = null;
      })
      // 2FA verification success
      .addMatcher(
        authApi.endpoints.verify2FALogin.matchFulfilled,
        (state, action) => {
          state.user = action.payload.data.user;
          state.tokens = action.payload.data.tokens;
          state.isAuthenticated = true;
          state.requiresTwoFactor = false;
          state.tempAuthData = null;
          state.error = null;

          // Store tokens in localStorage
          if (action.payload.data.tokens) {
            tokenUtils.setTokens(
              action.payload.data.tokens.accessToken,
              action.payload.data.tokens.refreshToken
            );
          }
        }
      )
      // 2FA verification error
      .addMatcher(
        authApi.endpoints.verify2FALogin.matchRejected,
        (state, action) => {
          state.error = action.error.message || "2FA verification failed";
          // Keep requiresTwoFactor true so user can retry
        }
      )
      // Get current user success
      .addMatcher(
        authApi.endpoints.getCurrentUser.matchFulfilled,
        (state, action) => {
          state.user = action.payload.data.user;
        }
      )
      // Logout success
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const {
  logout,
  clearError,
  updateUser,
  initializeAuth,
  setAuthData,
  setRequiresTwoFactor,
  completeTwoFactorAuth,
} = authSlice.actions;
export default authSlice.reducer;
