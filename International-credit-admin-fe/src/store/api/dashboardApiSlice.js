import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

import { logout } from "../slices/authSlice";

// Create base query with error handling
const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("accept", "application/json");
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  // Handle 401 errors by logging out the user
  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    toast.error("Session expired. Please log in again.");
  }

  return result;
};

export const dashboardApiSlice = createApi({
  reducerPath: "dashboardApi",
  baseQuery,
  tagTypes: ["SystemStatus", "Dashboard"],
  endpoints: (builder) => ({
    // Get system status
    getSystemStatus: builder.query({
      query: () => ({
        url: "/admin/system/status",
        method: "GET",
      }),
      transformResponse: (response) => {
        // Transform the response based on actual API structure
        const statusData = response?.data?.status || {};
        return {
          status: response?.status === "success" ? "healthy" : "error",
          timestamp: statusData?.timestamp || new Date().toISOString(),
          environment: statusData?.environment || "N/A",
          version: statusData?.version || "N/A",
          uptime: statusData?.uptime || 0,
          nodeVersion: statusData?.nodeVersion || "N/A",
          memory: {
            rss: statusData?.memory?.rss || 0,
            heapTotal: statusData?.memory?.heapTotal || 0,
            heapUsed: statusData?.memory?.heapUsed || 0,
            external: statusData?.memory?.external || 0,
            arrayBuffers: statusData?.memory?.arrayBuffers || 0,
            // Calculate usage percentage
            heapUsage: statusData?.memory?.heapTotal
              ? Math.round(
                  (statusData.memory.heapUsed / statusData.memory.heapTotal) *
                    100
                )
              : 0,
          },
        };
      },
      providesTags: ["SystemStatus"],
      // Refetch every 30 seconds for real-time status updates
      pollingInterval: 30000,
      // Keep data fresh for 10 seconds
      keepUnusedDataFor: 10,
    }),

    // Get dashboard stats (placeholder for future dashboard endpoints)
    getDashboardStats: builder.query({
      query: () => ({
        url: "/admin/dashboard/stats",
        method: "GET",
      }),
      transformResponse: (response) => {
        return {
          totalUsers: response?.data?.totalUsers || 0,
          activeUsers: response?.data?.activeUsers || 0,
          totalTransactions: response?.data?.totalTransactions || 0,
          totalVolume: response?.data?.totalVolume || 0,
          pendingKyc: response?.data?.pendingKyc || 0,
          systemAlerts: response?.data?.systemAlerts || 0,
        };
      },
      providesTags: ["Dashboard"],
      // Refetch every 60 seconds
      pollingInterval: 60000,
    }),

    // Get system health check
    getHealthCheck: builder.query({
      query: () => ({
        url: "/admin/system/health",
        method: "GET",
      }),
      transformResponse: (response) => {
        return {
          healthy: response?.data?.healthy ?? response?.healthy ?? true,
          services: response?.data?.services || response?.services || {},
          checks: response?.data?.checks || response?.checks || {},
          timestamp:
            response?.data?.timestamp ||
            response?.timestamp ||
            new Date().toISOString(),
        };
      },
      providesTags: ["SystemStatus"],
      // Refetch every 15 seconds for health monitoring
      pollingInterval: 15000,
    }),
  }),
});

export const {
  useGetSystemStatusQuery,
  useGetDashboardStatsQuery,
  useGetHealthCheckQuery,
  useLazyGetSystemStatusQuery,
  useLazyGetDashboardStatsQuery,
  useLazyGetHealthCheckQuery,
} = dashboardApiSlice;
