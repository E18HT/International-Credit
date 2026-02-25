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

export const auditApiSlice = createApi({
  reducerPath: "auditApi",
  baseQuery,
  tagTypes: ["AuditLog", "AuditStats"],
  endpoints: (builder) => ({
    // Get audit logs with pagination and filters
    getAuditLogs: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();

        // Pagination
        if (filters.page) params.append("page", filters.page.toString());
        if (filters.limit) params.append("limit", filters.limit.toString());

        // Filters
        if (filters.userId) params.append("userId", filters.userId);
        if (filters.userEmail) params.append("userEmail", filters.userEmail);
        if (filters.action) params.append("action", filters.action);
        if (filters.resource) params.append("resource", filters.resource);
        if (filters.method) params.append("method", filters.method);
        if (filters.status) params.append("status", filters.status);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.ipAddress) params.append("ipAddress", filters.ipAddress);
        if (filters.search) params.append("search", filters.search);

        const queryString = params.toString();
        return `/admin/audit-logs${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["AuditLog"],
      transformResponse: (response) => {
        return {
          logs: response?.data?.docs || response?.data?.logs || [],
          totalLogs:
            response?.data?.totalDocs || response?.data?.totalLogs || 0,
          currentPage: response?.data?.page || response?.data?.currentPage || 1,
          totalPages: response?.data?.totalPages || 0,
          limit: response?.data?.limit || 20,
          hasNextPage: response?.data?.hasNextPage || false,
          hasPreviousPage:
            response?.data?.hasPrevPage ||
            response?.data?.hasPreviousPage ||
            false,
        };
      },
    }),

    // Get single audit log by ID
    getAuditLogById: builder.query({
      query: (logId) => `/admin/audit-logs/${logId}`,
      providesTags: (result, error, logId) => [{ type: "AuditLog", id: logId }],
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    // Get audit history stats by timeframe
    getAuditHistoryStats: builder.query({
      query: () => `/admin/history/stats`,
      providesTags: ["AuditStats"],
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    //Kyc Grant
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogByIdQuery,
  useGetAuditHistoryStatsQuery,
} = auditApiSlice;
