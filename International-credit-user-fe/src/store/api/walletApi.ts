import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { tokenUtils, API_CONFIG } from "@/lib/api";

// Types for wallet API requests and responses
export interface WalletLinkRequest {
  address: string;
  network?: string;
  country?: string;
  signature: string;
  message: string;
}

export interface WalletLinkResponse {
  success: boolean;
  walletId?: string;
  message?: string;
  status?: string;
  data?: {
    walletId: string;
    address: string;
    network: string;
    isActive: boolean;
    linkedAt: string;
  };
}

export interface LinkedWallet {
  id: string;
  address: string;
  network: string;
  isActive: boolean;
  linkedAt: string;
  lastUsed?: string;
}

export interface GetWalletsResponse {
  success: boolean;
  data: {
    wallets: LinkedWallet[];
    total: number;
  };
}

export interface UnlinkWalletRequest {
  walletId: string;
}

export interface UnlinkWalletResponse {
  success: boolean;
  message?: string;
}

export interface RecordTransactionRequest {
  txHash: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  amountUSD: number;
  blockNumber: number;
  transactionIndex: number;
  gasUsed: string;
  gasPrice: string;
  transactionFee: number;
  contractAddress: string;
  network: string;
  description: string;
  tags: string[];
  blockTimestamp: string;
}

export interface RecordTransactionResponse {
  success: boolean;
  message?: string;
  data?: {
    transactionId?: string;
    txHash?: string;
  };
}

export interface TransactionHistoryRequest {
  page?: number;
  limit?: number;
}

export interface Transaction {
  _id: string;
  txHash: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  direction: string;
  status: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: {
    $numberDecimal: string;
  };
  blockNumber: number;
  amountUSD: {
    $numberDecimal: string;
  };
  transactionIndex: number;
  gasUsed: string;
  gasPrice: string;
  transactionFee: number;
  contractAddress: string;
  network: string;
  confirmations?: number;
  description: string;
  tags: string[];
  blockTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionHistoryResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}

// Staking Record Types
export interface StakingRecordRequest {
  transactionHash: string;
  blockHash: string;
  blockNumber: string;
  contractAddress: string;
  cumulativeGasUsed: string | number;
  effectiveGasPrice: string;
  from: string;
  to: string;
  gasUsed: string;
  root: string;
  status: string;
  stakeAmount: number;
  stakeDuration: number;
  percentage: number;
  tokenSymbol: string;
  network: string;
  description: string;
  stakeId: string;
}

export interface StakingRecordResponse {
  success: boolean;
  message?: string;
  data?: {
    stakingId: string;
    stakeId: string;
    transactionHash: string;
    stakeAmount: number;
    stakeDuration: number;
    percentage: number;
    tokenSymbol: string;
    network: string;
    createdAt: string;
  };
}

// Unstake Staking Types
export interface UnstakeStakingRequest {
  stakingId: string;
  txHash: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string;
  gasUsed: string;
  gasPrice: string;
  transactionFee: number;
  network: string;
  withdrawnAmount: number;
  actualReward: number;
  description: string;
}

// Withdraw Staking Types
export interface WithdrawStakingRequest {
  txHash: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string;
  gasUsed: string;
  gasPrice: string;
  transactionFee: number;
  network: string;
  withdrawnAmount: number;
  actualReward: number;
  description: string;
}

// Staking History Types
export interface StakingHistoryRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface StakingHistoryItem {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    identityKycDone: boolean;
    isLocked: boolean;
    id: string;
  };
  transactionHash: string;
  blockHash: string;
  blockNumber: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  to: string;
  gasUsed: string;
  root: string;
  status: string;
  stakeAmount: number;
  stakeDuration: number;
  percentage: number;
  tokenSymbol: string;
  stakingStatus: string;
  network: string;
  transactionFee: number;
  recordedBy: {
    _id: string;
    fullName: string;
    email: string;
    identityKycDone: boolean;
    isLocked: boolean;
    id: string;
  };
  description: string;
  tags: string[];
  internalStakeId: string;
  maturityDate: string;
  expectedReward: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
  stakeDurationMs: number;
  daysUntilMaturity: number;
  stakingProgress: number;
  id: string;
  metadata: {
    stakingType: string;
    autoRenewal: boolean;
    penaltyRate: number;
  };
}

export interface StakingHistoryResponse {
  status: string;
  data: {
    stakes: StakingHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Create the wallet API slice
export const walletApi = createApi({
  reducerPath: "walletApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Add content type and accept headers
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json");
      // Add ngrok bypass header (if needed)
      headers.set("ngrok-skip-browser-warning", "true");

      // Add authorization header if token exists
      const token = tokenUtils.getAccessToken();
      if (token && !tokenUtils.isTokenExpired(token)) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: [
    "Wallet",
    "LinkedWallets",
    "TransactionHistory",
    "StakingRecord",
    "RecordedTransaction",
    "StakingHistory",
  ],
  endpoints: (builder) => ({
    // Link wallet mutation
    linkWallet: builder.mutation<WalletLinkResponse, WalletLinkRequest>({
      query: (walletData) => ({
        url: API_CONFIG.ENDPOINTS.WALLETS.LINK,
        method: "POST",
        body: walletData,
      }),
      invalidatesTags: ["LinkedWallets"],
      transformResponse: (response: WalletLinkResponse) => {
        return response;
      },
      transformErrorResponse: (response) => {
        console.error("Failed to link wallet:", response);
        return response;
      },
    }),

    // Get linked wallets query
    getLinkedWallets: builder.query<GetWalletsResponse, void>({
      query: () => ({
        url: API_CONFIG.ENDPOINTS.WALLETS.WALLETS,
        method: "GET",
      }),
      providesTags: ["LinkedWallets"],
    }),

    // Unlink wallet mutation
    unlinkWallet: builder.mutation<UnlinkWalletResponse, UnlinkWalletRequest>({
      query: ({ walletId }) => ({
        url: `/wallets/${walletId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LinkedWallets"],
    }),

    // Update wallet (set as primary, etc.)
    updateWallet: builder.mutation<
      WalletLinkResponse,
      { walletId: string; updates: Partial<LinkedWallet> }
    >({
      query: ({ walletId, updates }) => ({
        url: `/wallets/${walletId}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: ["LinkedWallets"],
    }),

    // Record transaction
    recordTransaction: builder.mutation<
      RecordTransactionResponse,
      RecordTransactionRequest
    >({
      query: (transactionData) => ({
        url: "/transactions/record",
        method: "POST",
        body: transactionData,
      }),
      invalidatesTags: ["RecordedTransaction"],
    }),

    // Get transaction history
    getTransactionHistory: builder.query<
      TransactionHistoryResponse["data"],
      TransactionHistoryRequest
    >({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: `/transactions/history?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: ["TransactionHistory"],
      // Force refetch every time component mounts
      keepUnusedDataFor: 0, // Don't keep cached data
      // refetchOnMountOrArgChange: true, // Always refetch on mount
      transformResponse: (response: TransactionHistoryResponse) => {
        return response.data;
      },
    }),

    // Record staking transaction
    recordStaking: builder.mutation<
      StakingRecordResponse,
      StakingRecordRequest
    >({
      query: (stakingData) => ({
        url: "/staking/record",
        method: "POST",
        body: stakingData,
      }),
      invalidatesTags: [
        "StakingRecord",
        "TransactionHistory",
        "StakingHistory",
      ],
    }),

    // Get staking history
    getStakingHistory: builder.query<
      StakingHistoryResponse,
      StakingHistoryRequest
    >({
      query: ({
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = {}) => ({
        url: `/staking/history?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        method: "GET",
      }),
      providesTags: ["StakingHistory"],
      transformResponse: (response: StakingHistoryResponse) => {
        return response;
      },
    }),

    // Unstake staking
    unstakeStaking: builder.mutation<
      StakingRecordResponse,
      UnstakeStakingRequest
    >({
      query: (unstakeData) => ({
        url: "/staking/unstake/record",
        method: "POST",
        body: unstakeData,
      }),
      invalidatesTags: [
        "StakingRecord",
        "TransactionHistory",
        "StakingHistory",
      ],
    }),
    // Withdraw staking
    withdrawStaking: builder.mutation<
      StakingRecordResponse,
      { stakingId: string; withdrawData: WithdrawStakingRequest }
    >({
      query: ({ stakingId, withdrawData }) => ({
        url: `/staking/${stakingId}/withdraw`,
        method: "POST",
        body: withdrawData,
      }),
      invalidatesTags: [
        "StakingRecord",
        "TransactionHistory",
        "StakingHistory",
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLinkWalletMutation,
  useGetLinkedWalletsQuery,
  useUnlinkWalletMutation,
  useUpdateWalletMutation,
  useRecordTransactionMutation,
  useGetTransactionHistoryQuery,
  useRecordStakingMutation,
  useGetStakingHistoryQuery,
  useUnstakeStakingMutation,
  useWithdrawStakingMutation,
} = walletApi;

// Export the reducer and middleware
export const walletApiReducer = walletApi.reducer;
export const walletApiMiddleware = walletApi.middleware;
