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

export const transactionApiSlice = createApi({
  reducerPath: "transactionApi",
  baseQuery,
  tagTypes: ["Transaction", "TransactionStats"],
  endpoints: (builder) => ({
    // Get transaction statistics
    getTransactionStats: builder.query({
      query: () => "/admin/transactions/stats",
      providesTags: ["TransactionStats"],
      transformResponse: (response) => {
        return (
          response?.data || {
            totalTransactions: 0,
            totalVolume: 0,
            pendingTransactions: 0,
            failedTransactions: 0,
            totalTransactionsChange: 0,
            totalVolumeChange: 0,
            pendingTransactionsChange: 0,
            failedTransactionsChange: 0,
          }
        );
      },
    }),

    // Get transactions with pagination and filters
    getTransactions: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();

        // Pagination
        if (filters.page) params.append("page", filters.page.toString());
        if (filters.limit) params.append("limit", filters.limit.toString());

        // Filters
        if (filters?.transactionType !== "all")
          params.append("type", filters.transactionType);
        if (filters.status !== "all") params.append("status", filters.status);
        if (filters.currency !== "all")
          params.append("currency", filters.currency);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.userSearch) params.append("userSearch", filters.userSearch);
        if (filters.search) params.append("search", filters.search);

        const queryString = params.toString();
        return `/admin/transactions${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Transaction"],
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          transactions:
            response?.data?.docs || response?.data?.transactions || [],
          pagination: response?.data?.pagination || 0,
        };
      },
    }),

    // Get single transaction details
    getTransactionById: builder.query({
      query: (transactionId) => `/admin/transactions/${transactionId}`,
      providesTags: (result, error, transactionId) => [
        { type: "Transaction", id: transactionId },
      ],
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    // Update transaction status
    updateTransactionStatus: builder.mutation({
      query: ({ transactionId, status, reason }) => ({
        url: `/admin/transactions/${transactionId}/status`,
        method: "PATCH",
        body: { status, reason },
      }),
      invalidatesTags: (result, error, { transactionId }) => [
        "TransactionStats",
        "Transaction",
        { type: "Transaction", id: transactionId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Transaction status updated successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Refund transaction
    refundTransaction: builder.mutation({
      query: ({ transactionId, refundData }) => ({
        url: `/admin/transactions/${transactionId}/refund`,
        method: "POST",
        body: refundData,
      }),
      invalidatesTags: (result, error, { transactionId }) => [
        "TransactionStats",
        "Transaction",
        { type: "Transaction", id: transactionId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Transaction refunded successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Revoke transaction
    revokeTransaction: builder.mutation({
      query: ({ transactionId, reason }) => ({
        url: `/admin/transactions/${transactionId}/revoke`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (result, error, { transactionId }) => [
        "TransactionStats",
        "Transaction",
        { type: "Transaction", id: transactionId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Transaction revoked successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Approve transaction
    approveTransaction: builder.mutation({
      query: ({ transactionId, approvalData }) => ({
        url: `/admin/transactions/${transactionId}/approve`,
        method: "POST",
        body: approvalData,
      }),
      invalidatesTags: (result, error, { transactionId }) => [
        "TransactionStats",
        "Transaction",
        { type: "Transaction", id: transactionId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Transaction approved successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Export transactions
    exportTransactions: builder.mutation({
      query: (filters = {}) => ({
        url: "/admin/transactions/export",
        method: "GET",
        headers: {
          accept: "text/csv",
        },
        responseHandler: (response) => response.blob(),
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          const blob = result.data;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `transactions-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success("Transactions exported successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),
  }),
});

export const {
  useGetTransactionStatsQuery,
  useGetTransactionsQuery,
  useGetTransactionByIdQuery,
  useUpdateTransactionStatusMutation,
  useRefundTransactionMutation,
  useRevokeTransactionMutation,
  useApproveTransactionMutation,
  useExportTransactionsMutation,
} = transactionApiSlice;
