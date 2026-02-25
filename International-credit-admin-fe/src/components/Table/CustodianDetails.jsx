import React, { useState } from "react";
import {
  Download,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  Coins,
  MapPin,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  useLazyGetSignedUrlQuery,
  useUpdateCustodianStatusMutation,
} from "../../store/api/custodianApiSlice";

const CustodianDetails = ({ custodian, refetch }) => {
  const [open, setOpen] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  if (!custodian) return null;

  const [getSignedUrl, { isLoading: isGettingSignedUrl }] =
    useLazyGetSignedUrlQuery();

  const handleDownload = async (documentKey, documentName) => {
    try {
      const key = documentKey.split("com/").pop();
      const res = await getSignedUrl({
        key: key,
      }).unwrap();

      // The URL is directly in res.url, not res.data.url
      const downloadUrl = res?.url || res?.data?.url;

      if (downloadUrl) {
        // Create a temporary link to download the file
        const link = document.createElement("a");
        link.href = downloadUrl;

        // Extract filename from the URL or use provided name
        const filename =
          documentName ||
          downloadUrl.split("/").pop().split("?")[0] ||
          documentKey.split("/").pop() ||
          "document";

        link.download = filename;
        link.target = "_blank";

        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Document download started");
      } else {
        toast.error("Failed to get download URL");
      }
    } catch (error) {
      toast.error("Failed to download document");
      console.error("Download error:", error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-600">Active</Badge>;
      case "INACTIVE":
        return <Badge className="bg-yellow-600">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-600">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const [updateCustodianStatus, { isLoading: isUpdating }] =
    useUpdateCustodianStatusMutation();

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setShowStatusConfirm(true);
  };

  const handleUpdateStatus = async () => {
    try {
      const res = await updateCustodianStatus({
        custodianId: custodian._id,
        status: selectedStatus,
        notes: "This is a note",
      });
      if (res.data?.status === "success") {
        toast.success(res.data?.message);
        setShowStatusConfirm(false);
        refetch();
      }
    } catch (error) {
      toast.error("Failed to update status");
      console.error("Update status error:", error);
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    // Format phone number for better display
    return phone.replace(/(\+\d+)-(\d+)/, "$1 $2");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Custodian Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Basic Information</span>
                {getStatusBadge(custodian.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Name
                  </label>
                  <p className="text-sm font-semibold">{custodian.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Asset Type
                  </label>
                  <p className="text-sm font-semibold">
                    {custodian.asset_type === "GBT"
                      ? "Gold (GBT)"
                      : "Bitcoin (BBT)"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </label>
                  <p className="text-sm">{custodian.contact_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Contact Phone
                  </label>
                  <p className="text-sm">
                    {formatPhoneNumber(custodian.contact_phone)}
                  </p>
                </div>
                <div></div>
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select
                    value={custodian.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset-Specific Details */}
          {custodian.asset_type === "GBT" && custodian.gold_details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Gold Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Vault Bank Name
                    </label>
                    <p className="text-sm">
                      {custodian.gold_details.vault_bank_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Bank Address
                    </label>
                    <p className="text-sm">
                      {custodian.gold_details.bank_address}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Vault Serial Number
                    </label>
                    <p className="text-sm font-mono">
                      {custodian.gold_details.vault_serial_number}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Gold Quantity (oz)
                    </label>
                    <p className="text-sm font-semibold">
                      {custodian.gold_details.gold_quantity_oz} oz
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last Audit Date
                    </label>
                    <p className="text-sm">
                      {format(custodian.gold_details.last_audit_date, "Pp")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {custodian.asset_type === "BBT" && custodian.bitcoin_details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Bitcoin Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      Custodian Wallet Address
                    </label>
                    <p className="text-sm font-mono break-all">
                      {custodian.bitcoin_details.custodian_wallet_address}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      BTC Quantity
                    </label>
                    <p className="text-sm font-semibold">
                      {custodian.bitcoin_details.btc_quantity} BTC
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Platform Name
                    </label>
                    <p className="text-sm">
                      {custodian.bitcoin_details.custodian_platform_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last Verification Date
                    </label>
                    <p className="text-sm">
                      {format(custodian.last_action_at, "Pp")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Proof of Reserve Document */}
              {custodian.proof_of_reserve_key && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Proof of Reserve</p>
                      <p className="text-sm text-gray-600">
                        {custodian.proof_of_reserve_key.split("/").pop()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleDownload(
                        custodian.proof_of_reserve_key,
                        "Proof of Reserve"
                      )
                    }
                    disabled={isGettingSignedUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {"Download"}
                  </Button>
                </div>
              )}

              {/* Gold Verification Document */}
              {custodian.gold_details?.verification_document_key && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Gold Verification Document</p>
                      <p className="text-sm text-gray-600">
                        {custodian.gold_details.verification_document_key
                          .split("/")
                          .pop()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleDownload(
                        custodian.gold_details.verification_document_key,
                        "Gold Verification Document"
                      )
                    }
                    disabled={isGettingSignedUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {"Download"}
                  </Button>
                </div>
              )}

              {/* Bitcoin Reserve Verification Document */}
              {custodian.bitcoin_details?.reserve_verification_document_key && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">
                        Bitcoin Reserve Verification Document
                      </p>
                      <p className="text-sm text-gray-600">
                        {
                          custodian.bitcoin_details
                            .reserve_verification_document_key
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleDownload(
                        custodian.bitcoin_details
                          .reserve_verification_document_key,
                        "Bitcoin Reserve Verification Document"
                      )
                    }
                    disabled={isGettingSignedUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {"Download"}
                  </Button>
                </div>
              )}

              {/* Show message if no documents */}
              {!custodian.proof_of_reserve_key &&
                !custodian.gold_details?.verification_document_key &&
                !custodian.bitcoin_details
                  ?.reserve_verification_document_key && (
                  <p className="text-gray-500 text-center py-4">
                    No documents available
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Status Update Confirmation Modal */}
      <Dialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to update the custodian status to{" "}
              <span className="font-semibold">{selectedStatus}</span>?
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusConfirm(false);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? "Updating..." : "Confirm Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default CustodianDetails;
