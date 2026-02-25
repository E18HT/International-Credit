import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatEther } from "viem";
import { toast } from "sonner";
import { useDispatch } from "react-redux";

import { updateWalletConnecting } from "@/store/slices/walletSlice";

export const useWallet = () => {
  const dispatch = useDispatch();
  const { address, isConnected, chain } = useAccount();
  const { connectors, isPending, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });

  const connectWallet = async (connectorId) => {
    const connector = connectors.find((c) => c.id === connectorId);
    dispatch(updateWalletConnecting(true));
    if (connector) {
      try {
        const result = await connectAsync({ connector });

        // Call wallet linking API after successful connection

        return result;
      } catch (error) {
        disconnect();
        dispatch(updateWalletConnecting(false));
        // Handle different types of errors
        const errorObj = error;

        if (
          errorObj?.name === "UserRejectedRequestError" ||
          errorObj?.code === 4001
        ) {
          toast.error("Connection Cancelled", {
            description: "You cancelled the wallet connection request.",
          });
        } else if (errorObj?.name === "ConnectorNotFoundError") {
          toast.error("Wallet Not Found", {
            description: "Please install MetaMask or another supported wallet.",
          });
        } else if (errorObj?.name === "ConnectorAlreadyConnectedError") {
          toast.error("Already Connected", {
            description: "Wallet is already connected.",
          });
        } else {
          toast.error("Connection Failed", {
            description:
              errorObj?.message ||
              "Failed to connect wallet. Please try again.",
          });
        }
        throw error;
      }
    }
  };

  const formatBalance = (balance) => {
    if (!balance) return "0.00";
    return parseFloat(formatEther(balance)).toFixed(4);
  };

  const getShortAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    address,
    isConnected,
    chain,
    balance,
    formattedBalance: formatBalance(balance?.value),
    shortAddress: getShortAddress(address),
    connectWallet,
    disconnect,
    connectors,
    isPending,
  };
};
