import React, { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  useGetUserByIdQuery,
  useGetUserDocumentsQuery,
  useDownloadDocumentMutation,
  useRejectKycMutation,
  useApproveKycMutation,
} from "../../store/api/userManagementApiSlice";
import { getUserStatus } from "@/utils/utils";
const KycActionButtons = ({ user, onRefetch }) => {
  const [reason, setReason] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [approveKyc, { isLoading: isApproving }] = useApproveKycMutation();
  const [rejectKyc, { isLoading: isRejecting }] = useRejectKycMutation();

  /**
   * Handles KYC approval or rejection actions
   * Approve: Whitelists user and grants access
   * Reject: Blacklists user with reason and revokes access
   * Refetches user data after action to update UI
   */
  const handleKycAction = async (userId, action) => {
    if (action === "approve") {
      try {
        const response = await approveKyc(userId).unwrap();
        toast.success(response?.message || "KYC approved successfully");
        // Refetch user data to update UI with new status
        if (onRefetch) {
          onRefetch();
        }
        setShowApproveConfirm(false);
      } catch (error) {
        toast.error(error?.data?.message || "KYC approval failed");
        console.error("KYC approval failed:", error);
      }
    } else {
      try {
        // Reject KYC with reason - reason is required for audit trail
        const response = await rejectKyc({ userId, reason }).unwrap();
        toast.success(response?.message || "KYC rejected successfully");
        // Refetch user data to update UI with new status
        if (onRefetch) {
          onRefetch();
        }
        // Reset form state after successful rejection
        setReason("");
        setShowRejectConfirm(false);
        setShowRejectReason(false);
      } catch (error) {
        toast.error(error?.data?.message || "KYC rejection failed");
        console.error("KYC rejection failed:", error);
      }
    }
  };
  return (
    <div>
      {user?.identity?.adminApproval?.status !== "approved" ? (
        <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
          <DialogTrigger asChild>
            <Button size="sm" variant="unpause" disabled={isApproving}>
              {isApproving ? "Whitelisting..." : "Whitelist"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Whitelist</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to whitelist this user? This action will
                approve their KYC verification.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveConfirm(false)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                variant="unpause"
                onClick={() =>
                  handleKycAction(user?.identity?.verificationId, "approve")
                }
                disabled={isApproving || !user?.identity?.verificationId}
              >
                {isApproving ? "Whitelisting..." : "Confirm Whitelist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <>
          {/* Reason Input Dialog */}
          <Dialog open={showRejectReason} onOpenChange={setShowRejectReason}>
            <DialogTrigger asChild>
              <Button size="sm" variant="pause">
                {"Blacklist"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Reason for Blacklist</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col space-y-2">
                <Textarea
                  id="description"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for blacklisting this user..."
                  rows={3}
                  maxLength={500}
                  className={reason.length > 500 ? "border-red-500" : ""}
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span></span>
                  <span className={reason.length > 500 ? "text-red-500" : ""}>
                    {reason.length}/500
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectReason(false);
                    setReason("");
                  }}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="pause"
                  disabled={isRejecting || !reason.trim()}
                  onClick={() => {
                    if (reason.length < 10) {
                      toast.error("Reason must be at least 10 characters");
                      return;
                    }
                    setShowRejectReason(false);
                    setShowRejectConfirm(true);
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialog */}
          <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Blacklist</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-3">
                  Are you sure you want to blacklist this user? This action will
                  reject their KYC verification.
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Reason:
                  </p>
                  <p className="text-sm text-gray-600">{reason}</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectConfirm(false);
                    setShowRejectReason(true);
                  }}
                  disabled={isRejecting}
                >
                  Back
                </Button>
                <Button
                  variant="pause"
                  disabled={isRejecting}
                  onClick={() => {
                    handleKycAction(user?.identity?.verificationId, "reject");
                  }}
                >
                  {isRejecting ? "Blacklisting..." : "Confirm Blacklist"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
const UserDetailsModal = ({ user, trigger, onRefetch }) => {
  const [open, setOpen] = useState(false);
  const getStatusBadge = (status) => {
    switch (status) {
      case "UNVERIFIED":
        return <Badge className="bg-red-600">UNVERIFIED</Badge>;
      case "VERIFIED":
        return <Badge className="bg-green-600">VERIFIED</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-600">{status}</Badge>;
      case "REJECTED":
      case "FAILED":
        return <Badge className="bg-red-600">{status}</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  const {
    data: userDetails,
    isFetching,
    isLoading,
  } = useGetUserByIdQuery(user._id, {
    skip: !open,
  });
  const { data: userDocuments } = useGetUserDocumentsQuery(
    userDetails?.data?.user?.identity?.latestVerification?.sessionId,
    {
      skip:
        !open ||
        !userDetails?.data?.user?.identity?.latestVerification?.sessionId,
    }
  );

  const [downloadDocument, { isLoading: isDownloading }] =
    useDownloadDocumentMutation();

  const handleDownloadDocument = async (documentId, fileName) => {
    toast.success(`Downloading ${fileName}...`);
    const response = await downloadDocument(documentId).unwrap();
    if (response.status === "success" && response.data.url) {
      window.open(response.data.url, "_blank");
    }
  };

  const userData = userDetails?.data?.user;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-center flex-row pr-4">
          <DialogTitle>User Details: {userData?.fullName}</DialogTitle>
          {!(isFetching || isLoading) && (
            <KycActionButtons user={userData} onRefetch={onRefetch} />
          )}{" "}
        </DialogHeader>
        {isFetching || isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.fullName || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wallet Address
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.wallets[0]?.address || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    User ID
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1 font-mono">
                    {userData?._id || userData?.id || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Status Information
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    KYC Status
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(userData?.identityStatus)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    User Status
                  </label>
                  <div className="mt-1">
                    {getUserStatus(userData?.identity?.adminApproval?.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Verified
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        userData?.emailVerified
                          ? "bg-green-600"
                          : "bg-yellow-600"
                      }
                    >
                      {userData?.emailVerified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                </div>
              </div>
              {userData?.identity?.adminApproval?.status === "revoked" && (
                <div>
                  Rejection Reason :{" "}
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {userData?.identity?.adminApproval?.rejectionReason}{" "}
                  </label>
                </div>
              )}
            </div>

            {/* KYC Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                KYC Documents
              </h3>

              {userDocuments?.data?.verification.verifiedAt && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium  dark:text-gray-300">
                    KYC Verified At
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 ">
                    {format(userDocuments?.data?.verification.verifiedAt, "Pp")}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {userDocuments?.data.documents ? (
                  <>
                    {Object.values(userDocuments?.data?.documents)?.map(
                      (document) => {
                        if (!document) {
                          return null;
                        }
                        return (
                          <Card key={document?.id} className="p-2">
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
                                      {format(document?.created, "Pp")}
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
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      No documents submitted
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Two-Factor Authentication
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    2FA Enabled
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        userData?.twoFactor?.isEnabled
                          ? "bg-green-600"
                          : "bg-gray-600"
                      }
                    >
                      {userData?.twoFactor?.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Setup Completed
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        userData?.twoFactor?.setupCompleted
                          ? "bg-green-600"
                          : "bg-yellow-600"
                      }
                    >
                      {userData?.twoFactor?.setupCompleted
                        ? "Completed"
                        : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Preferences
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timezone
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.preferences?.timezone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        userData?.preferences?.notifications?.email
                          ? "bg-green-600"
                          : "bg-gray-600"
                      }
                    >
                      {userData?.preferences?.notifications?.email
                        ? "Enabled"
                        : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        userData?.preferences?.notifications?.push
                          ? "bg-green-600"
                          : "bg-gray-600"
                      }
                    >
                      {userData?.preferences?.notifications?.push
                        ? "Enabled"
                        : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Activity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Security & Activity
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Login Attempts
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.loginAttempts || 0}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Created At
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.createdAt
                      ? new Date(userData?.createdAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                    {userData?.updatedAt
                      ? new Date(userData?.updatedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
