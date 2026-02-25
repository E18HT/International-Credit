import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatEther } from "viem";
import { toast } from "sonner";
import {
  createWalletLinkMessage,
  prepareWalletLinkData,
} from "@/utils/walletUtils";
import {
  useGetLinkedWalletsQuery,
  useLinkWalletMutation,
} from "@/store/api/walletApi";
import { useSignMessage } from "wagmi";
import { useDispatch } from "react-redux";
import { updateWalletConnecting } from "@/store/slices/walletSlice";

export const useWallet = () => {
  const dispatch = useDispatch();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });
  const { signMessageAsync } = useSignMessage();
  const { data: linkedWallets } = useGetLinkedWalletsQuery();
  // RTK Query mutation for linking wallet
  const [linkWallet, { isLoading: isLinking, error: linkError }] =
    useLinkWalletMutation();
  const connectWallet = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    dispatch(updateWalletConnecting(true));
    if (connector) {
      try {
        const result = await connectAsync({ connector });

        // Call wallet linking API after successful connection
        try {
          const linkedWallet = linkedWallets?.data?.wallets.find(
            (wallet) => wallet.address === result?.accounts[0].toLowerCase()
          );
          if (linkedWallet) {
            dispatch(updateWalletConnecting(false));
            return linkedWallet;
          }
          const timestamp = Date.now();
          const message = createWalletLinkMessage(
            result?.accounts[0],
            timestamp
          );

          const signResult = await signMessageAsync({
            message: message,
            account: result?.accounts[0],
          });

          const linkResponse = await linkWallet({
            address: result?.accounts[0],
            signature: signResult,
            message: message,
            network: "hedera",
            country: "US",
          }).unwrap();

          if (linkResponse.status === "success") {
            dispatch(updateWalletConnecting(false));
            toast.success("Wallet Connected & Linked", {
              description:
                "Your wallet has been successfully connected and linked to your account.",
            });
            return linkResponse;
          } else {
            dispatch(updateWalletConnecting(false));
            disconnect();
            throw new Error(linkResponse.message || "Failed to link wallet");
          }
        } catch (linkError) {
          disconnect();
          dispatch(updateWalletConnecting(false));
          console.error("Failed to link wallet:", linkError);
          // Still show success for connection, but warn about linking
          toast.success("Wallet Not Connected", {
            description:
              "Wallet not connected but failed to link to account. Please try again in settings.",
          });
        }

        return result;
      } catch (error: unknown) {
        disconnect();
        dispatch(updateWalletConnecting(false));
        // Handle different types of errors
        const errorObj = error as {
          name?: string;
          code?: number;
          message?: string;
        };
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

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return "0.00";
    return parseFloat(formatEther(balance)).toFixed(4);
  };

  const getShortAddress = (address: string | undefined) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const linkCurrentWallet = async () => {
    if (!address || !isConnected) {
      toast.error("No wallet connected", {
        description: "Please connect a wallet first.",
      });
      return;
    }

    try {
      const linkData = await prepareWalletLinkData(address, chain?.id);
      const linkResponse = await linkWallet(linkData).unwrap();

      if (linkResponse.success) {
        toast.success("Wallet Linked", {
          description:
            "Your wallet has been successfully linked to your account.",
        });
      } else {
        throw new Error(linkResponse.message || "Failed to link wallet");
      }
    } catch (error) {
      console.error("Failed to link wallet:", error);
      toast.error("Linking Failed", {
        description: "Failed to link wallet to account. Please try again.",
      });
      throw error;
    }
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
    linkCurrentWallet,
    connectors,
    isPending,
    isLinking,
    linkError,
  };
};
