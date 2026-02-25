import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_CONFIG, tokenUtils } from "@/lib/api";

// Types for Create Connect Account
export interface CreateConnectAccountRequest {
  type: "express" | "standard" | "custom" | "document_biometric";
  return_url: string;
  cancel_url: string;
  forceNew: boolean;
}

export interface CreateConnectAccountResponse {
  stripeAccountId: string;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  is_ready_for_payments: boolean;
  is_ready_for_payouts: boolean;
  has_requirements: boolean;
  capabilities: {
    card_payments: string;
    transfers: string;
  };
  requirements: {
    currently_due: string[];
    past_due: string[];
    eventually_due: string[];
    pending_verification: string[];
  };
  country: string;
  default_currency: string;
  created_at: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  message: string;
  data: T;
}

// Specific type for the documents API response
export interface DocumentsApiResponse {
  status: "success" | "error";
  data: KycResponse;
}

export interface KycResponse {
  sessionId: string;
  status: "verified" | "requires_input" | "processing" | "failed" | string;
  type: "document_biometric" | "document" | string;
  documents: {
    front?: IdentityFile;
    back?: IdentityFile;
    selfie?: IdentityFile;
  };
  submittedAt: string; // ISO date
  verifiedAt?: string; // ISO date or null
}

export interface IdentityFile {
  id: string;
  filename: string;
  size: number;
  type: string; // e.g. "jpg", "png"
  purpose: "identity_document_downloadable" | string;
  url: string; // Stripe file URL
  expiresAt: string | null; // null if not expiring
  created: string; // ISO date
  status?: "verified" | "unverified" | string;
}

// Types for Create Account Link
export interface CreateAccountLinkRequest {
  stripe_account_id: string;
  user_id: string;
}

export interface CreateAccountLinkResponse {
  url: string;
  expires_at: number;
  created: number;
}

// Types for My Account (status check)
export interface BiometricDetails {
  requireMatchingSelfie: boolean;
  selfieCompleted: boolean;
  livenessCheckPassed: boolean;
}

export interface LastError {
  code: string;
  reason: string;
}

export interface DocumentDownloadResponse {
  id: string;
  object: "file_link";
  created: number;
  expired: boolean;
  expires_at: number;
  file: string;
  livemode: boolean;
  metadata: Record<string, any>;
  url: string;
}

export interface LatestVerification {
  _id: string;
  userId: string;
  sessionId: string;
  clientSecret: string;
  status: "verified" | "requires_input" | "processing" | "failed" | string;
  type: "document_biometric" | "document" | string;
  verificationFlow: "redirect" | "iframe" | string;
  biometricDetails: BiometricDetails;
  reviewedReasonCodes: string[];
  lastEventType: string;
  lastEventAt: string;
  returnUrl: string;
  cancelUrl: string;
  metadata: Record<string, any>;
  expiresAt: string;
  isActive: boolean;
  uploadedDocuments: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  lastEventId: string;
  submittedAt: string;
  verifiedAt: string;
  lastError?: LastError;
}

export interface ConnectAccountStatus {
  identityStatus:
    | "VERIFIED"
    | "PENDING"
    | "REQUIREMENTS_DUE"
    | "FAILED"
    | string;
  identityVerifiedAt?: string;
  latestVerification?: LatestVerification;
}

export const kycApi = createApi({
  reducerPath: "kycApi",
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
  tagTypes: ["ConnectAccount"],
  endpoints: (builder) => ({
    // Create Stripe Connect Account
    createConnectAccount: builder.mutation<
      ApiResponse<CreateConnectAccountResponse>,
      CreateConnectAccountRequest
    >({
      query: (accountData) => {
        const { ...rest } = accountData;

        return {
          url: "/identity/sessions",
          method: "POST",
          body: rest,
        };
      },
      invalidatesTags: ["ConnectAccount"],
    }),

    // Create Account Link for Onboarding
    createAccountLink: builder.mutation<
      ApiResponse<CreateAccountLinkResponse>,
      CreateAccountLinkRequest
    >({
      query: (linkData) => {
        const { user_id, ...rest } = linkData;
        const userId = user_id; // You can get this from your auth state
        const action = "onboard-link";
        const idempotencyKey = `${action}-${userId}-${Date.now()}`;

        return {
          url: "/connect/account-link",
          method: "POST",
          body: rest,
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        };
      },
      invalidatesTags: ["ConnectAccount"],
    }),

    // Get current user's Connect account status
    getMyConnectAccountStatus: builder.query<
      ApiResponse<ConnectAccountStatus>,
      void
    >({
      query: (args) => {
        return {
          url: "/identity/my-status",
          method: "GET",
        } as any;
      },
      providesTags: ["ConnectAccount"],
    }),

    getMyDocuments: builder.query<DocumentsApiResponse, void>({
      query: () => {
        return {
          url: "/identity/verification/my-documents",
          method: "GET",
        };
      },
      providesTags: ["ConnectAccount"],
    }),

    downloadDocument: builder.mutation<
      ApiResponse<DocumentDownloadResponse>,
      string
    >({
      query: (documentId) => {
        return {
          url: `/identity/download-documents/${documentId}`,
          method: "GET",
        };
      },
    }),
  }),
});

export const {
  useCreateConnectAccountMutation,
  useCreateAccountLinkMutation,
  useGetMyConnectAccountStatusQuery,
  useGetMyDocumentsQuery,
  useDownloadDocumentMutation,
} = kycApi;
