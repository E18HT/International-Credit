import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks/useRedux";
import {
  useCreateConnectAccountMutation,
  useGetMyConnectAccountStatusQuery,
} from "@/store/api/kycApi";
import { RootState } from "@/store/store";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { stripePromise } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const KYC = () => {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const { refetchUser } = useAuth();

  const { user } = useAppSelector((state: RootState) => state.auth);
  const [createAccount, { isLoading, error }] =
    useCreateConnectAccountMutation();
  const [loading, setLoading] = useState(false);

  const {
    data: myAccount,
    isLoading: isLoadingStatus,
    refetch,
  } = useGetMyConnectAccountStatusQuery();

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const response = await createAccount({
        type: "document_biometric",
        forceNew: true, // ← Add this to restart immediately
        return_url: `${window.location.origin}/wallet/kyc`,
        cancel_url: `${window.location.origin}/wallet/kyc`,
      }).unwrap();
      if (response.status === "success") {
        // Use redirect flow to avoid CSP issues in development

        // Fallback to iframe if no URL provided
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to load");

        // Fallback to iframe if no URL provided
        const verificationSession = await stripe.verifyIdentity(
          response.data.clientSecret
        );

        refetch();
        refetchUser();
        toast.success(
          "KYC started successfully. Please wait for Admin approval."
        );
        // Mount verification UI
      }
    } catch (error) {
      console.error("Failed to create account:", error);
    } finally {
      setLoading(false);
    }
  };

  // Derive a simple status string for UI
  const statusInfo = useMemo(() => {
    const status = myAccount?.data?.identityStatus;
    if (!status) return null;
    if (status === "VERIFIED") {
      return { type: "verified" as const, text: "Your KYC is complete." };
    }
    if (status === "REQUIREMENTS_DUE") {
      return {
        type: "review" as const,
        text: "KYC is under review. Additional information may be required.",
      };
    }
    return { type: "pending" as const, text: "KYC is in progress." };
  }, [myAccount]);

  useEffect(() => {
    void refetch();
  }, [refetch]);
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="KYC" subtitle="KYC Process" />

      <div className="px-6 flex flex-col justify-center h-full items-center max-w-md mt-5 mx-auto">
        {isLoadingStatus ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking KYC status...
          </div>
        ) : statusInfo ? (
          <div className="w-full">
            {statusInfo.type === "verified" && (
              <Alert className="mb-3">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your KYC was done successfully.
                </AlertDescription>
              </Alert>
            )}
            {statusInfo.type === "review" && (
              <Alert className="mb-3">
                <TriangleAlert className="h-4 w-4" />
                <AlertDescription>
                  ⏳ KYC in under review. Please complete any outstanding
                  requirements.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            To start KYC, please click the button below.
          </p>
        )}

        {myAccount?.data?.identityStatus !== "VERIFIED" ? (
          <Button
            className="w-full mt-1"
            disabled={isLoadingStatus || loading}
            onClick={handleCreateAccount}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Starting KYC..." : "Start KYC"}
          </Button>
        ) : statusInfo.type === "review" ? (
          <>
            <Button className="w-full mt-1" onClick={refetch}>
              Refresh KYC{" "}
            </Button>
            <Button
              variant="ghost"
              className="w-full mt-1"
              onClick={() => navigate("/")}
            >
              Back to home{" "}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              className="w-full mt-1"
              onClick={() => navigate("/")}
            >
              Back to home{" "}
            </Button>
          </>
        )}
        <div id="identity-verification-mount" ref={mountRef}></div>
      </div>
    </div>
  );
};

export default KYC;
