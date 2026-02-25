import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { authApi } from "./authApi";
import { tokenUtils } from "@/lib/api";

// User Profile API Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  walletAddress?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  address?: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  memberSince: string;
  lastLogin?: string;
  status: "active" | "inactive" | "suspended";
  role: "end_user" | "admin" | "moderator";
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: "public" | "private";
      showWalletAddress: boolean;
    };
    language: string;
    timezone: string;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  address?: string;
  profilePicture?: string;
}

export interface UpdatePreferencesRequest {
  email?: boolean;
  push?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorEnableRequest {
  token: string;
}

export interface TwoFactorDisableRequest {
  currentPassword: string;
  token: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange?: string;
  loginSessions: {
    id: string;
    device: string;
    location: string;
    ipAddress: string;
    lastActive: string;
    current: boolean;
  }[];
  securityEvents: {
    id: string;
    type:
      | "login"
      | "password_change"
      | "2fa_setup"
      | "2fa_disable"
      | "profile_update";
    timestamp: string;
    details: string;
    ipAddress: string;
    device: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface FCMTokenRequest {
  token: string;
  deviceType: "web" | "android" | "ios";
}

export interface FCMTokenResponse {
  status: string;
  message: string;
  data?: {
    success?: boolean;
    token?: string;
  };
}

// Admin History Export Types
export interface AdminHistoryExportFilters {
  category?: string;
  activityType?: string;
  userId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminHistoryExportRequest {
  filters: AdminHistoryExportFilters;
  format: "csv" | "json" | "xlsx";
}

export interface AdminHistoryExportResponse {
  status: string;
  message: string;
  data?: {
    downloadUrl?: string;
    fileId?: string;
    expiresAt?: string;
  };
}

export const userProfileApi = createApi({
  reducerPath: "userProfileApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const token = tokenUtils.getAccessToken();
      if (token && !tokenUtils.isTokenExpired(token)) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("accept", "application/json");
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["UserProfile", "SecuritySettings", "TwoFactor"],
  endpoints: (builder) => ({
    // Change password
    changePassword: builder.mutation<ApiResponse<void>, ChangePasswordRequest>({
      query: (passwordData) => ({
        url: "/auth/change-password",
        method: "POST",
        body: passwordData,
      }),
      invalidatesTags: ["SecuritySettings"],
    }),

    // 2FA Setup
    setup2FA: builder.mutation<ApiResponse<TwoFactorSetupResponse>, void>({
      query: () => ({
        url: "/2fa/setup",
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings"],
    }),

    // Verify and enable 2FA
    enable2FA: builder.mutation<
      ApiResponse<{ message: string; status: string }>,
      TwoFactorEnableRequest
    >({
      query: (enableData) => ({
        url: "/2fa/enable",
        method: "POST",
        body: enableData,
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings", "UserProfile"],
    }),

    // Disable 2FA
    disable2FA: builder.mutation<ApiResponse<void>, TwoFactorDisableRequest>({
      query: (disableData) => ({
        url: "/2fa/disable",
        method: "POST",
        body: disableData,
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings", "UserProfile"],
    }),

    // Verify email
    verifyEmail: builder.mutation<ApiResponse<void>, { token: string }>({
      query: ({ token }) => ({
        url: "/user/verify-email",
        method: "POST",
        body: { token },
      }),
      invalidatesTags: ["UserProfile"],
    }),

    // Link wallet address
    linkWallet: builder.mutation<
      ApiResponse<void>,
      { walletAddress: string; signature: string }
    >({
      query: (data) => ({
        url: "/user/wallet/link",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["UserProfile"],
    }),

    // Unlink wallet address
    unlinkWallet: builder.mutation<ApiResponse<void>, { password: string }>({
      query: (data) => ({
        url: "/user/wallet/unlink",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["UserProfile"],
    }),

    // Register FCM token for push notifications
    registerFCMToken: builder.mutation<FCMTokenResponse, FCMTokenRequest>({
      query: (tokenData) => ({
        url: "/users/fcm-token",
        method: "POST",
        body: tokenData,
      }),
      async onQueryStarted(_link, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate the User tag in authApi so getCurrentUser refetches
          dispatch(authApi.util.invalidateTags(["User"]));
        } catch {
          console.error("error");
        }
      },
    }),
    updateNotification: builder.mutation<
      FCMTokenResponse,
      UpdatePreferencesRequest
    >({
      query: (data) => ({
        url: `/notifications/preferences`,
        method: "PUT",
        body: data,
      }),
      async onQueryStarted(_link, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate the User tag in authApi so getCurrentUser refetches
          dispatch(authApi.util.invalidateTags(["User"]));
        } catch {
          console.error("error");
        }
      },
    }),

    // Export users (admin)
    exportUsers: builder.query<Blob, { format: "json" | "csv" | "xlsx" }>({
      query: ({ format }) => ({
        url: `/users/export?format=${format}`,
        method: "GET",
        // Return a Blob so callers can trigger a download
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useChangePasswordMutation,
  useSetup2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useVerifyEmailMutation,
  useLinkWalletMutation,
  useUnlinkWalletMutation,
  useRegisterFCMTokenMutation,
  useUpdateNotificationMutation,
  useLazyExportUsersQuery,
} = userProfileApi;
