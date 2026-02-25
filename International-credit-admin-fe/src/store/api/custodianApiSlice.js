import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

const baseQuery = fetchBaseQuery({
  baseUrl: "https://dev-be.internationalcredit.io/api/v1",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("accept", "*/*");
    return headers;
  },
});

// Enhanced base query with error handling
const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    const { status, data } = result.error;
    const message = data?.message || data?.error || "An error occurred";

    switch (status) {
      case 400:
        toast.error(`Bad Request: ${message}`);
        break;
      case 401:
        toast.error("Authentication required. Please log in again.");
        break;
      case 403:
        toast.error(
          "Access denied. You don't have permission for this action."
        );
        break;
      case 404:
        toast.error("Resource not found.");
        break;
      case 422:
        toast.error(`Validation Error: ${message}`);
        break;
      case 500:
      default:
        toast.error(message);
        break;
    }
  }
  return result;
};

export const custodianApiSlice = createApi({
  reducerPath: "custodianApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["CustodianStats", "Custodian", "CustodianList"],
  endpoints: (builder) => ({
    // Get custodian statistics
    getCustodianStats: builder.query({
      query: () => "/admin/custodians/stats",
      providesTags: ["CustodianStats"],
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          totalCustodians: response?.data?.total || 0,
          activeCustodians: response?.data?.active || 0,
          pendingCustodians: response?.data?.inactive || 0,
          suspendedCustodians: response?.data?.suspended || 0,
        };
      },
    }),

    // Get custodians list with pagination, filters, and sorting
    getCustodians: builder.query({
      query: ({
        page = 1,
        limit = 20,
        status,
        search,
        sort = "last_action_at:desc",
      } = {}) => {
        const params = new URLSearchParams();
        params.append("limit", limit.toString());
        params.append("sort", sort);

        if (page > 1) params.append("page", page.toString());
        if (status) params.append("status", status);
        if (search) params.append("search", search);

        return `/admin/custodians?${params.toString()}`;
      },
      providesTags: ["CustodianList"],
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          custodians:
            response?.data?.custodians ||
            response?.data?.docs ||
            response?.data ||
            [],
          totalCustodians:
            response?.data?.totalCustodians ||
            response?.data?.totalDocs ||
            response?.data?.total ||
            response?.data?.length ||
            0,
          currentPage: response?.data?.currentPage || response?.data?.page || 1,
          totalPages:
            response?.data?.totalPages ||
            Math.ceil(
              (response?.data?.total || 0) / (response?.data?.limit || 20)
            ) ||
            1,
          hasNextPage:
            response?.data?.hasNextPage || response?.data?.hasNext || false,
          hasPreviousPage:
            response?.data?.hasPreviousPage ||
            response?.data?.hasPrevPage ||
            response?.data?.hasPrev ||
            false,
          limit: response?.data?.limit || 20,
        };
      },
    }),

    // Get single custodian details
    getCustodianById: builder.query({
      query: (custodianId) => `/admin/custodians/${custodianId}`,
      providesTags: (result, error, custodianId) => [
        { type: "Custodian", id: custodianId },
      ],
    }),

    // Approve custodian
    approveCustodian: builder.mutation({
      query: ({ custodianId, approvalData }) => ({
        url: `/admin/custodians/${custodianId}/approve`,
        method: "POST",
        body: approvalData,
      }),
      invalidatesTags: (result, error, { custodianId }) => [
        "CustodianStats",
        "CustodianList",
        { type: "Custodian", id: custodianId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Custodian approved successfully");
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
        }
      },
    }),

    // Reject custodian
    rejectCustodian: builder.mutation({
      query: ({ custodianId, rejectionReason }) => ({
        url: `/admin/custodians/${custodianId}/reject`,
        method: "POST",
        body: { reason: rejectionReason },
      }),
      invalidatesTags: (result, error, { custodianId }) => [
        "CustodianStats",
        "CustodianList",
        { type: "Custodian", id: custodianId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          toast.success("Custodian rejected");
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
        }
      },
    }),

    // Create new custodian
    createCustodian: builder.mutation({
      query: (custodianData) => ({
        url: "/admin/custodians",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: custodianData,
      }),
      invalidatesTags: ["CustodianStats", "CustodianList"],
      transformResponse: (response) => {
        return response?.data || response;
      },
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          toast.success("Custodian created successfully");
          return result;
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
          throw error;
        }
      },
    }),

    // Download custodian document
    downloadCustodianDocument: builder.mutation({
      query: (documentKey) => ({
        url: `/admin/custodians/documents/${documentKey}`,
        method: "GET",
        responseType: "blob",
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const result = await queryFulfilled;
          const url = window.URL.createObjectURL(new Blob([result.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", arg);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          toast.success("Document downloaded successfully");
        } catch (error) {
          toast.error("Failed to download document");
          console.error("Download error:", error);
        }
      },
    }),

    // Upload file (multipart/form-data)
    uploadFile: builder.mutation({
      query: ({ file, bucketType }) => {
        const formData = new FormData();
        if (file) formData.append("file", file);
        if (bucketType) formData.append("bucketType", "kyc");
        return {
          url: "/uploads",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response) => response?.data || response,
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
        }
      },
    }),

    // Update custodian status
    updateCustodianStatus: builder.mutation({
      query: ({ custodianId, status, notes }) => ({
        url: `/admin/custodians/${custodianId}/status`,
        method: "PUT",
        headers: {
          "Idempotency-Key": status,
        },
        body: {
          status,
          notes,
        },
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          dispatch(custodianApiSlice.util.invalidateTags(["CustodianStats"]));
        } catch (error) {
          // Error handling is done in baseQueryWithErrorHandling
        }
      },
    }),

    // Get signed URL for document access
    getSignedUrl: builder.query({
      query: ({ key, bucketType = "kyc", expiresIn = 3600 }) => ({
        url: `/uploads/signed-url?key=${encodeURIComponent(
          key
        )}&bucketType=${bucketType}&expiresIn=${expiresIn}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetCustodianStatsQuery,
  useGetCustodiansQuery,
  useGetCustodianByIdQuery,
  useUpdateCustodianStatusMutation,
  useApproveCustodianMutation,
  useRejectCustodianMutation,
  useCreateCustodianMutation,
  useDownloadCustodianDocumentMutation,
  useUploadFileMutation,
  useLazyGetSignedUrlQuery,
} = custodianApiSlice;
