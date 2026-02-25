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
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Auth", "User"],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    // Verify 2FA during login
    verify2FALogin: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login/2fa",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth", "User"],
    }),

    // Get current user details
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["User"],
      transformResponse: (response) => {
        return response?.data || response;
      },
    }),
  }),
});

export const { useLoginMutation, useVerify2FALoginMutation, useGetMeQuery } =
  apiSlice;
