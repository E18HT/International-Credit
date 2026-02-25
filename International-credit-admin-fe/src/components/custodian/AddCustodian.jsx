import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import PhoneNumberInput from "../ui/phone-number-input";
import {
  useCreateCustodianMutation,
  useUploadFileMutation,
} from "../../store/api/custodianApiSlice";
const AddCustodian = () => {
  const [open, setOpen] = useState(false);
  const [createCustodian, { isLoading: isCreating }] =
    useCreateCustodianMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: "",
      assetType: "",
      contactEmail: "",
      contactPhone: "",
      countryCode: "61",
      phoneNumber: "",
      description: "",
      // Files
      proofOfReserve: null,
      goldVerificationDocument: null,
      bbtReserveVerificationDocument: null,
      // Gold (GBT)
      goldVaultBankName: "",
      bankAddress: "",
      vaultSerialNumber: "",
      goldQuantityOz: "",
      lastAuditDate: "",
      // Bitcoin (BBT)
      bbtCustodianWalletAddress: "",
      btcQuantity: "",
      bbtCustodianPlatformName: "",
      bbtLastVerificationDate: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  // Watch asset type for conditional validation
  const assetType = watch("assetType");

  // Watch all form values to check if form is valid
  const formValues = watch();
  // Upload API
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  /**
   * Handles file upload to S3 storage
   * Uploads file to KYC bucket and stores the returned key in form state
   * Falls back to file name if key is not returned
   */
  const handleFileUpload = async (file, fieldName) => {
    if (!file) {
      setValue(fieldName, null, { shouldValidate: true });
      return;
    }
    try {
      const resp = await uploadFile({ file, bucketType: "kyc" }).unwrap();
      const uploadedKey = resp?.key;
      if (uploadedKey) {
        // Store S3 key for later retrieval
        setValue(fieldName, uploadedKey, { shouldValidate: true });
        toast.success("File uploaded");
      } else {
        // Fallback: store original file name if S3 key not available
        setValue(fieldName, file.name, { shouldValidate: true });
      }
    } catch (e) {
      toast.error("Upload failed");
      console.error(e);
    }
  };

  /**
   * Validates form completeness based on asset type
   * GBT (Gold) and BBT (Bitcoin) require different sets of fields
   * Returns true only if all required fields for selected asset type are filled
   */
  const isFormValid = () => {
    // Common required fields for all asset types
    const commonFieldsValid =
      formValues.name &&
      formValues.assetType &&
      formValues.contactEmail &&
      formValues.countryCode &&
      formValues.phoneNumber &&
      formValues.description &&
      formValues.proofOfReserve;

    if (!commonFieldsValid) return false;

    // Asset-specific validation: Gold (GBT) requires vault and audit details
    if (assetType === "GBT") {
      return (
        formValues.goldVaultBankName &&
        formValues.bankAddress &&
        formValues.vaultSerialNumber &&
        formValues.goldQuantityOz &&
        formValues.lastAuditDate &&
        formValues.goldVerificationDocument
      );
    }
    // Asset-specific validation: Bitcoin (BBT) requires wallet and platform details
    else if (assetType === "BBT") {
      return (
        formValues.bbtCustodianWalletAddress &&
        formValues.btcQuantity &&
        formValues.bbtCustodianPlatformName &&
        formValues.bbtLastVerificationDate &&
        formValues.bbtReserveVerificationDocument
      );
    }

    return true;
  };

  /**
   * Submits custodian form data to API
   * Constructs payload dynamically based on asset type (GBT/BBT)
   * Handles file keys (S3 keys) vs file names for document uploads
   */
  const onSubmit = async (data) => {
    try {
      // Build base payload with common fields for all custodian types
      const basePayload = {
        name: data.name,
        asset_type: data.assetType,
        contact_email: data.contactEmail,
        // Format phone number with country code: +{countryCode}-{phoneNumber}
        contact_phone: `+${data?.countryCode}-${data?.phoneNumber}`,
        status: "ACTIVE",
        // Handle both S3 key (string) and File object (use name as fallback)
        proof_of_reserve_key:
          typeof data.proofOfReserve === "string"
            ? data.proofOfReserve
            : data.proofOfReserve?.name,
        ...(data.description && { description: data.description }),
      };

      // Add Gold (GBT) specific fields if asset type is GBT
      if (data.assetType === "GBT") {
        basePayload.gold_details = {
          vault_bank_name: data.goldVaultBankName || undefined,
          bank_address: data.bankAddress || undefined,
          vault_serial_number: data.vaultSerialNumber || undefined,
          // Parse quantity as float, default to undefined if empty
          gold_quantity_oz:
            data.goldQuantityOz !== ""
              ? parseFloat(data.goldQuantityOz)
              : undefined,
          last_audit_date: data.lastAuditDate || undefined,
          // Handle S3 key or file name for verification document
          verification_document_key:
            typeof data.goldVerificationDocument === "string"
              ? data.goldVerificationDocument
              : data.goldVerificationDocument?.name,
        };
      }
      // Add Bitcoin (BBT) specific fields if asset type is BBT
      else if (data.assetType === "BBT") {
        basePayload.bitcoin_details = {
          custodian_wallet_address: data.bbtCustodianWalletAddress || undefined,
          // Parse BTC quantity as float, default to undefined if empty
          btc_quantity:
            data.btcQuantity !== "" ? parseFloat(data.btcQuantity) : undefined,
          custodian_platform_name: data.bbtCustodianPlatformName || undefined,
          last_verification_date: data.bbtLastVerificationDate || undefined,
          // Handle S3 key or file name for reserve verification document
          reserve_verification_document_key:
            typeof data.bbtReserveVerificationDocument === "string"
              ? data.bbtReserveVerificationDocument
              : data.bbtReserveVerificationDocument?.name,
        };
      }
      const res = await createCustodian(basePayload).unwrap();
      reset();
      setOpen(false);
    } catch (error) {
      console.error("Failed to create custodian:", error);
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
    }
  };
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Custodian
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Custodian</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Custodian Name *</Label>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Custodian name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    placeholder="XYZ Custody Services"
                    className={errors.name ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="assetType">Asset Type *</Label>
              <Controller
                name="assetType"
                control={control}
                rules={{
                  required: "Asset type is required",
                }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={errors.assetType ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBT">Gold (GBT)</SelectItem>
                      <SelectItem value="BBT">Bitcoin (BBT)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assetType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.assetType.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Controller
                name="contactEmail"
                control={control}
                rules={{
                  required: "Contact email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="contactEmail"
                    type="email"
                    placeholder="custody@example.com"
                    className={errors.contactEmail ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.contactEmail && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>
            <div>
              <PhoneNumberInput
                control={control}
                name="contactPhone"
                label="Contact Phone "
                placeholder="1234567890"
                required={true}
                errors={errors}
                countryCodeName="countryCode"
                phoneNumberName="phoneNumber"
                defaultCountryCode="61"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Controller
              name="description"
              control={control}
              rules={{
                required: "Description is required",
                maxLength: {
                  value: 500,
                  message: "Description must be less than 500 characters",
                },
              }}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Brief description of the custodian..."
                  rows={3}
                  className={errors.description ? "border-red-500" : ""}
                />
              )}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Proof of Reserve (common) */}
            <div>
              <Label htmlFor="proofOfReserve">Upload Proof of Reserve *</Label>
              <Controller
                name="proofOfReserve"
                control={control}
                rules={{
                  required: "Proof of reserve document is required",
                }}
                render={({ field: { onChange } }) => (
                  <Input
                    id="proofOfReserve"
                    type="file"
                    accept=".pdf,.jpeg,.jpg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        handleFileUpload(file, "proofOfReserve");
                      } else {
                        onChange(null);
                      }
                    }}
                    className={
                      errors.proofOfReserve
                        ? "border-red-500 cursor-pointer"
                        : "cursor-pointer"
                    }
                  />
                )}
              />
              {errors.proofOfReserve && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.proofOfReserve.message}
                </p>
              )}
            </div>
          </div>

          {/* Conditional fields for Gold (GBT) */}
          {watch("assetType") === "GBT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goldVaultBankName">Vault Bank Name *</Label>
                  <Controller
                    name="goldVaultBankName"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Vault bank name is required for Gold assets"
                          : false,
                      minLength: {
                        value: 2,
                        message:
                          "Vault bank name must be at least 2 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="goldVaultBankName"
                        placeholder="HSBC Vault - London"
                        className={
                          errors.goldVaultBankName ? "border-red-500" : ""
                        }
                      />
                    )}
                  />
                  {errors.goldVaultBankName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.goldVaultBankName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="bankAddress">Bank Address *</Label>
                  <Controller
                    name="bankAddress"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Bank address is required for Gold assets"
                          : false,
                      minLength: {
                        value: 5,
                        message: "Bank address must be at least 5 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="bankAddress"
                        placeholder="123 Gold St, London, UK"
                        className={errors.bankAddress ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.bankAddress && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.bankAddress.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vaultSerialNumber">
                    Vault Serial Number *
                  </Label>
                  <Controller
                    name="vaultSerialNumber"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Vault serial number is required for Gold assets"
                          : false,
                      minLength: {
                        value: 3,
                        message:
                          "Vault serial number must be at least 3 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="vaultSerialNumber"
                        placeholder="GOLD-VAULT-12345"
                        className={
                          errors.vaultSerialNumber ? "border-red-500" : ""
                        }
                      />
                    )}
                  />
                  {errors.vaultSerialNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.vaultSerialNumber.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="goldQuantityOz">Gold Quantity (oz) *</Label>
                  <Controller
                    name="goldQuantityOz"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Gold quantity is required for Gold assets"
                          : false,
                      pattern: {
                        value: /^\d*\.?\d*$/,
                        message: "Please enter a valid number",
                      },
                      min: {
                        value: 0.01,
                        message: "Gold quantity must be greater than 0",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="goldQuantityOz"
                        type="number"
                        placeholder="1200"
                        min="0"
                        step="0.01"
                        className={
                          errors.goldQuantityOz ? "border-red-500" : ""
                        }
                      />
                    )}
                  />
                  {errors.goldQuantityOz && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.goldQuantityOz.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lastAuditDate">Last Audit Date *</Label>
                  <Controller
                    name="lastAuditDate"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Last audit date is required for Gold assets"
                          : false,
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="lastAuditDate"
                        type="date"
                        className={errors.lastAuditDate ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.lastAuditDate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.lastAuditDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="goldVerificationDocument">
                    Verification Document *
                  </Label>
                  <Controller
                    name="goldVerificationDocument"
                    control={control}
                    rules={{
                      required:
                        assetType === "GBT"
                          ? "Verification document is required for Gold assets"
                          : false,
                    }}
                    render={({ field: { onChange } }) => (
                      <Input
                        id="goldVerificationDocument"
                        type="file"
                        accept=".pdf,.jpeg,.jpg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            handleFileUpload(file, "goldVerificationDocument");
                          } else {
                            onChange(null);
                          }
                        }}
                        className={
                          errors.goldVerificationDocument
                            ? "border-red-500 cursor-pointer"
                            : "cursor-pointer"
                        }
                      />
                    )}
                  />
                  {errors.goldVerificationDocument && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.goldVerificationDocument.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditional fields for Bitcoin (BBT) */}
          {watch("assetType") === "BBT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bbtCustodianWalletAddress">
                    Custodian Wallet Address *
                  </Label>
                  <Controller
                    name="bbtCustodianWalletAddress"
                    control={control}
                    rules={{
                      required:
                        assetType === "BBT"
                          ? "Custodian wallet address is required for Bitcoin assets"
                          : false,
                      minLength: {
                        value: 10,
                        message:
                          "Wallet address must be at least 10 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="bbtCustodianWalletAddress"
                        placeholder="0x9fC0...1234"
                        className={
                          errors.bbtCustodianWalletAddress
                            ? "border-red-500"
                            : ""
                        }
                      />
                    )}
                  />
                  {errors.bbtCustodianWalletAddress && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.bbtCustodianWalletAddress.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="btcQuantity">BTC Quantity (in BTC) *</Label>
                  <Controller
                    name="btcQuantity"
                    control={control}
                    rules={{
                      required:
                        assetType === "BBT"
                          ? "BTC quantity is required for Bitcoin assets"
                          : false,
                      pattern: {
                        value: /^\d*\.?\d*$/,
                        message: "Please enter a valid number",
                      },
                      min: {
                        value: 0.00000001,
                        message: "BTC quantity must be greater than 0",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="btcQuantity"
                        type="number"
                        placeholder="2.5"
                        min="0"
                        step="0.00000001"
                        className={errors.btcQuantity ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {errors.btcQuantity && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.btcQuantity.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bbtCustodianPlatformName">
                    Custodian Platform Name *
                  </Label>
                  <Controller
                    name="bbtCustodianPlatformName"
                    control={control}
                    rules={{
                      required:
                        assetType === "BBT"
                          ? "Custodian platform name is required for Bitcoin assets"
                          : false,
                      minLength: {
                        value: 2,
                        message: "Platform name must be at least 2 characters",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="bbtCustodianPlatformName"
                        placeholder="BitGo Custody"
                        className={
                          errors.bbtCustodianPlatformName
                            ? "border-red-500"
                            : ""
                        }
                      />
                    )}
                  />
                  {errors.bbtCustodianPlatformName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.bbtCustodianPlatformName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="bbtLastVerificationDate">
                    Last Verification Date *
                  </Label>
                  <Controller
                    name="bbtLastVerificationDate"
                    control={control}
                    rules={{
                      required:
                        assetType === "BBT"
                          ? "Last verification date is required for Bitcoin assets"
                          : false,
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="bbtLastVerificationDate"
                        type="date"
                        className={
                          errors.bbtLastVerificationDate ? "border-red-500" : ""
                        }
                      />
                    )}
                  />
                  {errors.bbtLastVerificationDate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.bbtLastVerificationDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="bbtReserveVerificationDocument">
                    Reserve Verification Document *
                  </Label>
                  <Controller
                    name="bbtReserveVerificationDocument"
                    control={control}
                    rules={{
                      required:
                        assetType === "BBT"
                          ? "Reserve verification document is required for Bitcoin assets"
                          : false,
                    }}
                    render={({ field: { onChange } }) => (
                      <Input
                        id="bbtReserveVerificationDocument"
                        type="file"
                        accept=".pdf,.jpeg,.jpg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            handleFileUpload(
                              file,
                              "bbtReserveVerificationDocument"
                            );
                          } else {
                            onChange(null);
                          }
                        }}
                        className={
                          errors.bbtReserveVerificationDocument
                            ? "border-red-500 cursor-pointer"
                            : "cursor-pointer"
                        }
                      />
                    )}
                  />
                  {errors.bbtReserveVerificationDocument && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.bbtReserveVerificationDocument.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isCreating || !isFormValid()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Custodian"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustodian;
