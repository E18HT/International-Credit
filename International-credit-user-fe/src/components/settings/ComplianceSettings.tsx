import { useState } from "react";
import {
  Shield,
  FileText,
  Upload,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { toast } from "sonner";
import {
  useDownloadDocumentMutation,
  useGetMyDocumentsQuery,
} from "@/store/api/kycApi";
import { useAppSelector } from "@/hooks/useRedux";
import { RootState } from "@/store/store";
import { useNavigate } from "react-router-dom";

export const ComplianceSettings = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const {
    data: myDocuments,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useGetMyDocumentsQuery();
  const [downloadDocument, { isLoading: isDownloading }] =
    useDownloadDocumentMutation();
  const navigate = useNavigate();
  const getKYCStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "expired":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800 border-green-200";
      case "UNVERIFIED":
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "EXPIRED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleDownloadDocument = async (
    documentId: string,
    fileName: string
  ) => {
    toast.success(`Downloading ${fileName}...`);
    const response = await downloadDocument(documentId).unwrap();
    if (response.status === "success" && response.data.url) {
      window.open(response.data.url, "_blank");
    }

    // Implement document download logic
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <AccordionItem value="compliance">
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-medium">Compliance</span>
          {isLoadingDocuments
            ? null
            : myDocuments?.data?.status !== "verified" && (
                <Badge variant="destructive" className="ml-2">
                  Action Required
                </Badge>
              )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-6">
          {/* KYC Documents */}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium">KYC Documents</h3>
            </div>

            {/* KYC Status Overview */}
            <Card
              className={`p-4 border ${getKYCStatusColor(
                user?.identityStatus
              )}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getKYCStatusIcon(user?.identityStatus)}
                  <div>
                    <p className="font-medium capitalize">
                      {user?.identityStatus}
                    </p>
                    {myDocuments?.data?.submittedAt && (
                      <p className="text-sm opacity-80">
                        Submitted: {formatDate(myDocuments?.data?.submittedAt)}
                        <br />
                        Verified: {formatDate(myDocuments?.data?.verifiedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            {user?.identityStatus !== "VERIFIED" && (
              <Button onClick={() => navigate("/wallet/kyc")}>
                Submit Your KYC
              </Button>
            )}

            {/* Document List */}
            {myDocuments?.data?.documents?.front ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Submitted Documents:</p>
                {Object.values(myDocuments?.data?.documents)?.map(
                  (document) => {
                    if (!document) {
                      return null;
                    }
                    return (
                      <Card key={document?.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 w-full">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col gap-1 w-full">
                              <p className="font-medium text-sm max-w-[250px] truncate">
                                {document?.filename}
                              </p>
                              <div className="flex justify-between items-center gap-1">
                                <p className="text-xs text-muted-foreground ">
                                  {document?.type}
                                  <br />
                                  {formatDate(document?.created)}
                                </p>
                                <div className="flex  items-center gap-2">
                                  {document?.status && (
                                    <Badge
                                      variant={
                                        document?.status === "verified"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {document?.status}
                                    </Badge>
                                  )}
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isDownloading}
                                      onClick={() =>
                                        handleDownloadDocument(
                                          document?.id,
                                          document?.filename
                                        )
                                      }
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">No documents submitted</p>
              </div>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
