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

export const userManagementApiSlice = createApi({
  reducerPath: "userManagementApi",
  baseQuery,
  tagTypes: ["User", "UserList", "UserDocuments"],
  endpoints: (builder) => ({
    // Get Users with pagination and filters
    getUsers: builder.query({
      query: ({
        page = 1,
        limit = 20,
        role = "end_user",
        status,
        search,
      } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (role) params.append("role", role);
        if (status) params.append("status", status);
        if (search) params.append("search", search);

        return `/admin/users?${params.toString()}`;
      },
      providesTags: ["UserList"],
      transformResponse: (response) => {
        // Transform the response to match expected format
        return {
          users: response?.data?.docs || [],
          totalUsers: response?.data?.totalDocs || 0,
          currentPage: response?.data?.page || 1,
          totalPages: response?.data?.totalPages || 0,
          limit: response?.data?.limit || 10,
          hasNextPage: response?.data?.hasNextPage || false,
          hasPreviousPage: response?.data?.hasPrevPage || false,
        };
      },
      keepUnusedDataFor: 0,
    }),

    // Get Single User by ID
    getUserById: builder.query({
      query: (userId) => `/admin/users/${userId}`,
      keepUnusedDataFor: 0,
      providesTags: (result, error, userId) => [{ type: "User", id: userId }],
    }),

    // Get User Documents
    getUserDocuments: builder.query({
      query: (sessionId) => `/identity/admin/sessions/${sessionId}/documents`,
      providesTags: (result, error, sessionId) => [
        { type: "UserDocuments", id: sessionId },
      ],
      keepUnusedDataFor: 0,
    }),

    downloadDocument: builder.mutation({
      query: (documentId) => {
        return {
          url: `/identity/download-documents/${documentId}`,
          method: "GET",
        };
      },
    }),

    approveKyc: builder.mutation({
      query: (url) => ({
        url: `/admin/kyc/${url}/approve`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
      invalidatesTags: ["approveKyc"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate the UserList cache to trigger refetch
          dispatch(userManagementApiSlice.util.invalidateTags(["UserList"]));
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),
    rejectKyc: builder.mutation({
      query: (data) => ({
        url: `/admin/kyc/${data.userId}/reject`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { reason: data.reason },
      }),
      invalidatesTags: ["rejectKyc"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate the UserList cache to trigger refetch
          dispatch(userManagementApiSlice.util.invalidateTags(["UserList"]));
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetUserDocumentsQuery,
  useDownloadDocumentMutation,
  useApproveKycMutation,
  useRejectKycMutation,
} = userManagementApiSlice;
