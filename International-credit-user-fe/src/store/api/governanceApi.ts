import { API_CONFIG, tokenUtils } from "@/lib/api";
import {
  createApi,
  fetchBaseQuery,
  RootState,
} from "@reduxjs/toolkit/query/react";
import { TransactionReceipt } from "viem";

export interface Proposal {
  _id: string;
  txHash: string;
  proposalId: number;
  title: string;
  description: string;
  proposer: string;
  blockNumber: number;
  status: string;
  votingStatus: string;
  isActive: boolean;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotes: number;
  requiredVotes: number;
  passed: boolean;
  failed: boolean;
  expired: boolean;
  votingDeadline: string;
  createdAt: string;
  lastBlockchainSync: string;
  blockchainStatus: string;
  blockchainError: string | null;
  creator: {
    _id: string;
    email: string;
    fullName: string;
  };
}

export interface ProposalPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProposalSummary {
  totalProposals: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BlockchainInfo {
  serviceInitialized: boolean;
  contractAddress: string;
  rpcUrl: string;
  syncedProposals: number;
  failedSyncs: number;
  totalProposalsToSync: number;
}

export interface ProposalData {
  proposals: Proposal[];
  pagination: ProposalPagination;
  summary: ProposalSummary;
  blockchain: BlockchainInfo;
}

export interface ProposalResponse {
  status: string;
  data: ProposalData;
}

export interface VoteData {
  proposalId: number;
  voter: string;
  hasVoted: boolean;
}

export interface EventData {
  eventName: string;
  args: Record<string, unknown>;
  logIndex: number;
}
export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

export interface ProposalTransaction extends TransactionReceipt {
  title: string;
  description: string;
  proposalId: number;
}

export interface RecordTransactionResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId?: string;
    proposalId?: number;
  };
}

export const governanceApi = createApi({
  reducerPath: "governanceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: (headers, { getState }) => {
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
  tagTypes: ["Proposal", "Vote"],
  endpoints: (builder) => ({
    recordTransaction: builder.mutation<
      RecordTransactionResponse,
      ProposalTransaction
    >({
      query: (transactionData) => ({
        url: "/governance/record-transaction",
        method: "POST",
        body: transactionData,
      }),
      invalidatesTags: ["Proposal", "Vote"],
    }),

    getProposals: builder.query<
      ProposalData,
      {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      }
    >({
      query: ({
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = {}) => ({
        url: `/governance/proposals?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        method: "GET",
      }),
      providesTags: ["Proposal"],
      transformResponse: (response: ProposalResponse) => {
        return response.data;
      },
    }),

    getProposal: builder.query<Proposal, string>({
      query: (proposalId) => `/governance/transaction/${proposalId}`,
      providesTags: (result, error, proposalId) => [
        { type: "Proposal", id: proposalId },
      ],
      transformResponse: (response: { data: Proposal; status: string }) => {
        return response.data;
      },
    }),

    getVotes: builder.query<VoteData[], number>({
      query: (proposalId) => `/proposals/${proposalId}/votes`,
      providesTags: (result, error, proposalId) => [
        { type: "Vote", id: proposalId },
      ],
    }),
  }),
});

export const {
  useRecordTransactionMutation,
  useGetProposalsQuery,
  useGetProposalQuery,
  useGetVotesQuery,
} = governanceApi;
