import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { useAppSelector } from "@/hooks/useRedux";
import { RootState } from "@/store/store";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

import { useAccount } from "wagmi";
import { Alert, AlertDescription } from "../ui/alert";

const KYCStatusBadge = () => {
  const { walletConnecting } = useAppSelector((state) => state.wallet);

  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  if (!isConnected || walletConnecting) return null;
  if (
    user.identityStatus === "VERIFIED" &&
    user?.identity.adminApproval.status === "approved"
  )
    return null;
  if (user?.identity.adminApproval.status === "revoked")
    return (
      <Alert variant="destructive" className="mb-3">
        <AlertDescription>
          Your account has been blacklisted. Please contact the administrator
          (support@internationalcredit.io).
        </AlertDescription>
      </Alert>
    );
  if (
    user?.identity.adminApproval.status === "pending" &&
    user.identityStatus === "VERIFIED"
  )
    return (
      <Alert variant="default" className="mb-3">
        <AlertDescription>
          Your identity has been verified! Our team will now perform a final
          review to whitelist your account.
        </AlertDescription>
      </Alert>
    );
  if (user.identityStatus === "UNVERIFIED")
    return (
      <>
        <Alert variant="default" className="mb-3">
          <AlertDescription>
            Your identity has not been verified. Please Re-submit your KYC to
            continue.
          </AlertDescription>
        </Alert>
        <Button className="w-full mt-1" onClick={() => navigate("/wallet/kyc")}>
          Re-Submit KYC
        </Button>
      </>
    );

  return (
    <>
      <Alert variant="destructive">
        <AlertDescription>
          Your KYC is pending. Please submit your KYC to continue.
        </AlertDescription>
      </Alert>
      <Button className="w-full mt-1" onClick={() => navigate("/wallet/kyc")}>
        Submit KYC
      </Button>
    </>
  );
};

export default KYCStatusBadge;
