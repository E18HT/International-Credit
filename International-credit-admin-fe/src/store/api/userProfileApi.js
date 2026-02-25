import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { apiSlice } from "./apiSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: "https://dev-be.internationalcredit.io/api/v1",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("accept", "*/*");
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// Enhanced base query with error handling
const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    const { status, data } = result.error;
    const message = data?.message || data?.error || "An error occurred";

    switch (status) {
      case 400:
        toast.error(`Bad Request: ${message}`);
        break;
      case 401:
        toast.error("Authentication required. Please log in again.");
        break;
      case 403:
        toast.error(
          "Access denied. You don't have permission for this action."
        );
        break;
      case 404:
        toast.error("Resource not found.");
        break;
      case 422:
        toast.error(`Validation Error: ${message}`);
        break;
      case 500:
      default:
        toast.error(message);
        break;
    }
  }
  return result;
};

export const userProfileApiSlice = createApi({
  reducerPath: "userProfileApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["FCMToken"],
  endpoints: (builder) => ({
    // Register FCM token for push notifications
    registerFCMToken: builder.mutation({
      query: ({ token, deviceType = "web" }) => ({
        url: "/users/fcm-token",
        method: "POST",
        body: {
          token,
          deviceType,
        },
      }),
      invalidatesTags: ["FCMToken"],
      transformResponse: (response) => {
        return response?.data || response;
      },
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          dispatch(apiSlice.util.invalidateTags(["User"]));

          // Success toast is handled in the component
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
          throw error;
        }
      },
    }),

    // Disable/Toggle FCM notifications via link
    updateNotification: builder.mutation({
      query: (link) => ({
        url: `/notifications/preferences`,
        method: "PUT",
        body: link,
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          dispatch(apiSlice.util.invalidateTags(["User"]));

          // Success toast is handled in the component
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
          throw error;
        }
      },
    }),
  }),
});

export const { useRegisterFCMTokenMutation, useUpdateNotificationMutation } =
  userProfileApiSlice;
