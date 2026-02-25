import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_CONFIG, tokenUtils } from "@/lib/api";
import { walletApi } from "./walletApi";

export interface PaymentQuoteRequest {
  fiatAmount: number;
  fiatCurrency: string;
  asset: string;
}

export interface PaymentQuoteResponse {
  success: boolean;
  data: {
    fiatAmount: number;
    fiatCurrency: string;
    asset: string;
    tokenAmount: number;
    exchangeRate: number;
    fees: {
      processingFee: number;
      networkFee: number;
      totalFees: number;
    };
    total: number;
    quoteId: string;
    expiresAt: string;
  };
  message?: string;
}

export interface PaymentIntentRequest {
  quoteId: string;
  paymentMethod: string;
}

export interface PaymentIntentResponse {
  status: string;
  message: string;
  data: {
    clientSecret: string;
    paymentId: string;
    stripePaymentIntentId: string;
    ucAmount: number;
    exchangeRate: number;
  };
}

export interface MintTokenRequest {
  userAddress: string;
  amount: string;
  reason: string;
}

export interface MintTokenResponse {
  success: boolean;
  message: string;
  data?: {
    transactionHash?: string;
    amount?: string;
  };
}

export const paymentsApi = createApi({
  reducerPath: "paymentsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");

      const token = tokenUtils.getAccessToken();
      if (token && !tokenUtils.isTokenExpired(token)) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Quote", "Payment"],
  endpoints: (builder) => ({
    getPaymentQuote: builder.mutation<
      PaymentQuoteResponse,
      PaymentQuoteRequest
    >({
      query: (quoteData) => ({
        url: "/payments/quote",
        method: "POST",
        body: quoteData,
      }),
      invalidatesTags: ["Quote"],
    }),

    createPaymentIntent: builder.mutation<
      PaymentIntentResponse,
      PaymentIntentRequest
    >({
      query: (intentData) => ({
        url: "/payments/intent",
        method: "POST",
        body: intentData,
      }),
      invalidatesTags: ["Payment"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Refetch transaction history after successful payment intent creation
          dispatch(walletApi.util.invalidateTags(["TransactionHistory"]));
        } catch {
          // Handle error if needed
        }
      },
    }),

    mintTokens: builder.mutation<MintTokenResponse, MintTokenRequest>({
      query: (mintData) => ({
        url: "/admin/ic/mint",
        method: "POST",
        body: mintData,
      }),
      invalidatesTags: ["Payment"],
    }),
  }),
});

export const {
  useGetPaymentQuoteMutation,
  useCreatePaymentIntentMutation,
  useMintTokensMutation,
} = paymentsApi;
