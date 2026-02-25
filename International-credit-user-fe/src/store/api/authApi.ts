import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { tokenUtils, API_CONFIG } from "@/lib/api";

// Types for API requests and responses

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  status: string;
  message: string;
}
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  status: "success" | "error";
  message: string;
  data?: any;
}

export interface Wallet {
  metadata: {
    isMultisig: boolean;
  };
  _id: string;
  address: string;
  network: string;
  country: string;
  whitelistState: string;
}

interface AdminApproval {
  status: "pending" | "approved" | "rejected" | "revoked";
  onChainKycGranted: boolean;
}

interface VerificationData {
  status: string;
  verifiedAt: null | string; // or Date if you parse it
  verificationId: null | string;
  adminApproval: AdminApproval;
  latestVerification: null | any; // Replace 'any' with specific type if known
}
export interface User {
  _id: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  kycStatus: string;
  identityStatus: string;
  createdAt: string;
  updatedAt: string;
  wallets: Wallet[];
  fullName: string;
  twoFactor?: {
    setupCompleted?: boolean;
    isEnabled?: boolean;
  };
  identity: VerificationData;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  status: string;
  message: string;
  requiresTwoFactor?: boolean;
  data: {
    user: User;
    tokens: Tokens;
  };
}

export interface ForgotPasswordResponse {
  status: string;
  message: string;
  data: {
    resetToken: string;
  };
}

export interface ResetPasswordResponse {
  status: string;
  message: string;
}

export interface TwoFactorVerifyRequest {
  email: string;
  password: string;
  twoFactorToken: string;
}

// Create the auth API slice
export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Add content type and accept headers
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json");
      // Add ngrok bypass header
      headers.set("ngrok-skip-browser-warning", "true");

      // Add authorization header if token exists
      const token = tokenUtils.getAccessToken();
      if (token && !tokenUtils.isTokenExpired(token)) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Auth", "User"],
  endpoints: (builder) => ({
    // Register mutation
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        method: "POST",
        body: userData,
      }),
      transformResponse: (response: AuthResponse) => {
        // Store tokens when registration is successful
        if (response.status === "success" && response.data.tokens) {
          tokenUtils.setTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken
          );
        }
        return response;
      },
      invalidatesTags: ["Auth", "User"],
    }),

    // Login mutation
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: AuthResponse) => {
        // Store tokens when login is successful
        if (response.status === "success" && response.data.tokens) {
          tokenUtils.setTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken
          );
        }
        return response;
      },
      invalidatesTags: ["Auth", "User"],
    }),

    // Get current user query (optional - for fetching user profile)
    getCurrentUser: builder.query<{ data: { user: User } }, void>({
      query: () => ({
        url: "/auth/me", // Assuming you have this endpoint
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    // Verify 2FA during login
    verify2FALogin: builder.mutation<AuthResponse, TwoFactorVerifyRequest>({
      query: (credentials) => ({
        url: "/auth/login/2fa",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth", "User"],
    }),

    // Refresh token mutation (optional)
    refreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: ({ refreshToken }) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.REFRESH,
        method: "POST",
        body: { refreshToken },
      }),
      transformResponse: (response: AuthResponse) => {
        // Store new tokens when refresh is successful
        if (response.status === "success" && response.data.tokens) {
          tokenUtils.setTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken
          );
        }
        return response;
      },
      invalidatesTags: ["Auth", "User"],
    }),

    // Logout mutation (optional - if you have server-side logout)
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: API_CONFIG.ENDPOINTS.AUTH.LOGOUT,
        method: "POST",
      }),
      transformResponse: (response: unknown) => {
        // Clear tokens on logout
        tokenUtils.clearTokens();
        return response as { message: string };
      },
      invalidatesTags: ["Auth", "User"],
    }),

    // Forgot password mutation
    forgotPassword: builder.mutation<
      ForgotPasswordResponse,
      ForgotPasswordRequest
    >({
      query: (data) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
        method: "POST",
        body: data,
      }),
    }),

    // Reset password mutation
    resetPassword: builder.mutation<
      ResetPasswordResponse,
      ResetPasswordRequest
    >({
      query: (data) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
        method: "POST",
        body: data,
      }),
    }),

    // Verify email mutation
    verifyEmail: builder.mutation<VerifyEmailResponse, string>({
      query: (token) => ({
        url: `/auth/verify-email/${token}`,
        method: "POST",
      }),
      invalidatesTags: ["Auth", "User"],
    }),

    changePassword: builder.mutation<
      ChangePasswordResponse,
      ChangePasswordRequest
    >({
      query: (data) => ({
        url: API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth", "User"],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useRegisterMutation,
  useLoginMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useVerify2FALoginMutation,
  useChangePasswordMutation,
} = authApi;

// Export the reducer and middleware
export const authApiReducer = authApi.reducer;
export const authApiMiddleware = authApi.middleware;
