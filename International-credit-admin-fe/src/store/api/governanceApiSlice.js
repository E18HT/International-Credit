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

export const governanceApiSlice = createApi({
  reducerPath: "governanceApi",
  baseQuery,
  tagTypes: ["Proposal", "GovernanceStats", "Vote"],
  endpoints: (builder) => ({
    // Get user's governance proposals/transactions with pagination
    getProposals: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        return `/governance/proposals?${params.toString()}`;
      },
      providesTags: ["Proposal"],
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          proposals: response?.data?.proposals || response?.data?.docs || [],
          totalProposals: response?.data.summary.totalProposals || 0,
          currentPage: response?.data?.currentPage || response?.data?.page || 1,
          totalPages: response?.data?.totalPages || 0,
          hasNextPage: response?.data?.hasNextPage || false,
          hasPreviousPage:
            response?.data?.hasPreviousPage ||
            response?.data?.hasPrevPage ||
            false,
          limit: response?.data?.limit || 10,
        };
      },
      // Merge pages for "Load More" functionality
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          // First page or refresh - replace cache
          return newItems;
        }
        // Subsequent pages - merge with existing
        return {
          ...newItems,
          proposals: [
            ...(currentCache?.proposals || []),
            ...newItems.proposals,
          ],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.page !== previousArg?.page;
      },
    }),

    // Get all proposals with filters
    getAllProposals: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.status) params.append("status", filters.status);
        if (filters.type) params.append("type", filters.type);
        if (filters.search) params.append("search", filters.search);
        if (filters.page) params.append("page", filters.page.toString());
        if (filters.limit) params.append("limit", filters.limit.toString());

        const queryString = params.toString();
        return `/governance/proposals${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Proposal"],
      transformResponse: (response) => {
        return {
          proposals: response?.data?.proposals || [],
          totalProposals: response?.data?.totalProposals || 0,
          currentPage: response?.data?.currentPage || 1,
          totalPages: response?.data?.totalPages || 0,
          hasNextPage: response?.data?.hasNextPage || false,
          hasPreviousPage: response?.data?.hasPreviousPage || false,
        };
      },
    }),

    // Get single proposal by ID
    getProposalById: builder.query({
      query: (proposalId) => `/governance/proposals/${proposalId}`,
      providesTags: (result, error, proposalId) => [
        { type: "Proposal", id: proposalId },
      ],
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    // Create new proposal
    createProposal: builder.mutation({
      query: (proposalData) => ({
        url: "/governance/proposals",
        method: "POST",
        body: proposalData,
      }),
      invalidatesTags: ["Proposal", "GovernanceStats"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Proposal created successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Vote on proposal
    voteOnProposal: builder.mutation({
      query: ({ proposalId, ...voteData }) => ({
        url: `/governance/proposals/${proposalId}/vote`,
        method: "POST",
        body: voteData,
      }),
      invalidatesTags: (result, error, { proposalId }) => [
        { type: "Proposal", id: proposalId },
        "Proposal",
        "GovernanceStats",
        "Vote",
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Vote submitted successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Get governance statistics
    getGovernanceStats: builder.query({
      query: () => "/governance/stats",
      providesTags: ["GovernanceStats"],
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    // Get user's voting history
    getUserVotes: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.page) params.append("page", filters.page.toString());
        if (filters.limit) params.append("limit", filters.limit.toString());

        const queryString = params.toString();
        return `/governance/votes${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Vote"],
      transformResponse: (response) => {
        return response?.data;
      },
    }),

    // Execute proposal (admin only)
    executeProposal: builder.mutation({
      query: (proposalId) => ({
        url: `/governance/proposals/${proposalId}/execute`,
        method: "POST",
      }),
      invalidatesTags: (result, error, proposalId) => [
        { type: "Proposal", id: proposalId },
        "Proposal",
        "GovernanceStats",
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Proposal executed successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),

    // Cancel proposal (proposer or admin only)
    cancelProposal: builder.mutation({
      query: (proposalId) => ({
        url: `/governance/proposals/${proposalId}/cancel`,
        method: "POST",
      }),
      invalidatesTags: (result, error, proposalId) => [
        { type: "Proposal", id: proposalId },
        "Proposal",
        "GovernanceStats",
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Proposal cancelled successfully");
        } catch (error) {
          // Error handling is done in baseQuery
        }
      },
    }),
  }),
});

export const {
  useGetProposalsQuery,
  useGetAllProposalsQuery,
  useGetProposalByIdQuery,
  useCreateProposalMutation,
  useVoteOnProposalMutation,
  useGetGovernanceStatsQuery,
  useGetUserVotesQuery,
  useExecuteProposalMutation,
  useCancelProposalMutation,
} = governanceApiSlice;
