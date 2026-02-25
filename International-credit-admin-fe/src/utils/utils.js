import { createPublicClient, http } from "viem";
import { injected } from "@wagmi/connectors";
import { hederaTestnet } from "viem/chains";
import { createConfig } from "wagmi";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  Shield,
  User,
  Activity,
} from "lucide-react";
import { addDays, differenceInDays, format } from "date-fns";

export const client = createPublicClient({
  chain: hederaTestnet,
  transport: http(),
});

export const config = createConfig({
  chains: [hederaTestnet],
  connectors: [injected()],
  transports: {
    [hederaTestnet.id]: http(),
  },
});
export function formatNumber(number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    currency: "USD",
    style: "currency",
  }).format(number);
}

export const getActionBadge = (action) => {
  const actionUpper = action?.toUpperCase() || "";
  switch (actionUpper) {
    case "KYC_APPROVED":
      return <Badge className="bg-green-600 text-white">KYC Approved</Badge>;
    case "KYC_REJECTED":
      return <Badge className="bg-red-600 text-white">KYC Rejected</Badge>;
    case "USER_SUSPENDED":
      return <Badge className="bg-red-600 text-white">User Suspended</Badge>;
    case "RESERVE_UPDATE":
      return <Badge className="bg-blue-600 text-white">Reserve Update</Badge>;
    case "MULTISIG_APPROVED":
      return (
        <Badge className="bg-purple-600 text-white">MultiSig Approved</Badge>
      );
    case "LOGIN":
      return <Badge className="bg-gray-600 text-white">Login</Badge>;
    case "LOGOUT":
      return <Badge className="bg-gray-600 text-white">Logout</Badge>;
    case "CREATE":
      return <Badge className="bg-green-600 text-white">Create</Badge>;
    case "UPDATE":
      return <Badge className="bg-blue-600 text-white">Update</Badge>;
    case "DELETE":
      return <Badge className="bg-red-600 text-white">Delete</Badge>;
    case "VIEW":
      return <Badge className="bg-gray-600 text-white">View</Badge>;
    default:
      return (
        <Badge variant="outline">
          {action?.replace(/_/g, " ") || "Unknown"}
        </Badge>
      );
  }
};

export const getActionIcon = (action) => {
  const actionUpper = action?.toUpperCase() || "";
  switch (actionUpper) {
    case "KYC APPROVED":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "KYC REJECTED":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "USER SUSPENDED":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "RESERVE_UPDATE":
      return <Shield className="h-4 w-4 text-blue-600" />;
    case "LOGIN":
    case "LOGOUT":
      return null;
    case "CREATE":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "UPDATE":
      return <Activity className="h-4 w-4 text-blue-600" />;
    case "DELETE":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "VIEW":
      return <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-200" />;
  }
};
export function getRemainingDays(createdDate) {
  const expiryDate = addDays(createdDate, 7);
  const now = new Date();
  const remainingDays = differenceInDays(expiryDate, now);
  return remainingDays;
}
export function getEndDate(createdDate) {
  const expiryDate = addDays(createdDate, 7);
  const expiryDateNew = new Date(expiryDate);
  const result = format(expiryDateNew, "Pp");
  return result;
}

export const auditActions = [
  "TRANSFER",
  "DEPOSIT",
  "WITHDRAWAL",
  "PROPOSAL_CREATE",
];

export const getUserStatus = (status) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600">Whitelisted</Badge>;
    case "pending":
      return <Badge className="bg-yellow-600">New User</Badge>;
    case "revoked":
      return <Badge className="bg-red-600 dark:text-white">Blacklisted</Badge>;
    default:
      return <Badge className="bg-yellow-600">PENDING</Badge>;
  }
};
