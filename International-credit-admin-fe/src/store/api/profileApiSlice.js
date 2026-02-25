import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { logout } from "../slices/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    headers.set("accept", "application/json");
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const { status, data, error } = result.error;
    const message = data?.message || error || "An unexpected error occurred";

    switch (status) {
      case 0:
      case "FETCH_ERROR":
        toast.error("Network error. Please check your connection.");
        break;
      case 400:
      case 422:
        if (data?.errors) {
          Object.values(data.errors)
            .flat()
            .forEach((m) => toast.error(String(m)));
        } else {
          toast.error(message);
        }
        break;
      case 401:
        api.dispatch(logout());
        toast.error("Session expired. Please login again.");
        break;
      case 403:
        toast.error("Access denied.");
        break;
      case 404:
        toast.error("Resource not found.");
        break;
      case 429:
        toast.error("Too many requests. Try again later.");
        break;
      case 500:
      default:
        toast.error(message);
        break;
    }
  }
  return result;
};

export const profileApiSlice = createApi({
  reducerPath: "profileApi",
  baseQuery,
  tagTypes: ["UserProfile", "TwoFactor", "SecuritySettings"],
  endpoints: (builder) => ({
    // Get User Profile
    getUserProfile: builder.query({
      query: () => ({
        url: "/profile",
        method: "GET",
      }),
      providesTags: ["UserProfile"],
    }),

    // Update User Profile
    updateProfile: builder.mutation({
      query: (profileData) => ({
        url: "/profile",
        method: "PUT",
        body: profileData,
      }),
      invalidatesTags: ["UserProfile"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Profile updated successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Change Password
    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: "/profile/change-password",
        method: "POST",
        body: passwordData,
      }),
      invalidatesTags: ["SecuritySettings"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Password changed successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // 2FA Setup
    setup2FA: builder.mutation({
      query: () => ({
        url: "/2fa/setup",
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("2FA setup initiated. Please scan the QR code.");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Verify and enable 2FA
    enable2FA: builder.mutation({
      query: (enableData) => ({
        url: "/2fa/enable",
        method: "POST",
        body: enableData,
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings", "UserProfile"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Two-Factor Authentication enabled successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Disable 2FA
    disable2FA: builder.mutation({
      query: (disableData) => ({
        url: "/2fa/disable",
        method: "POST",
        body: disableData,
      }),
      invalidatesTags: ["TwoFactor", "SecuritySettings", "UserProfile"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Two-Factor Authentication disabled successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Get 2FA Status
    get2FAStatus: builder.query({
      query: () => ({
        url: "/2fa/status",
        method: "GET",
      }),
      providesTags: ["TwoFactor"],
    }),

    // Get Security Settings
    getSecuritySettings: builder.query({
      query: () => ({
        url: "/profile/security",
        method: "GET",
      }),
      providesTags: ["SecuritySettings"],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useSetup2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useGet2FAStatusQuery,
  useGetSecuritySettingsQuery,
} = profileApiSlice;
