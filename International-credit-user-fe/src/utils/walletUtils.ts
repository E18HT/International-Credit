import { WalletLinkRequest } from "@/store/api/walletApi";

// Get user's country code (you might want to use a geolocation service)
export const getUserCountry = async (): Promise<string> => {
  try {
    // Option 1: Use a free geolocation API
    const response = await fetch("https://ipapi.co/country_code/", {
      method: "GET",
    });

    if (response.ok) {
      const countryCode = await response.text();
      return countryCode.trim().toUpperCase();
    }
  } catch (error) {
    console.warn("Failed to get user country:", error);
  }

  // Fallback to US if geolocation fails
  return "US";
};

// Create signature message for wallet linking
export const createWalletLinkMessage = (
  address: string,
  timestamp: number
): string => {
  return `Link wallet ${address} to International Credit account at ${new Date(
    timestamp
  ).toISOString()}`;
};

// Sign message using wallet
export const signWalletMessage = async (
  address: string,
  message: string,
  walletClient?: unknown // You might want to type this properly based on your wallet client
): Promise<string> => {
  try {
    if (!walletClient) {
      throw new Error("Wallet client not available");
    }

    // For MetaMask/Ethereum wallets
    const ethereum = (window as { ethereum?: any }).ethereum;
    if (ethereum) {
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });
      return signature as string;
    }

    throw new Error("No compatible wallet found");
  } catch (error) {
    console.error("Failed to sign message:", error);
    throw error;
  }
};

// Prepare wallet link data (without making the API call)
export const prepareWalletLinkData = async (
  address: string,
  chainId?: number
): Promise<WalletLinkRequest> => {
  // Get user's country
  const country = await getUserCountry();

  // Create timestamp and message
  const timestamp = Date.now();
  const message = createWalletLinkMessage(address, timestamp);

  // Sign the message
  const signature = await signWalletMessage(address, message);

  // Determine network based on chainId (you can expand this)
  let network = "ethereum";
  if (chainId) {
    switch (chainId) {
      case 1:
        network = "ethereum";
        break;
      case 137:
        network = "polygon";
        break;
      case 42161:
        network = "arbitrum";
        break;
      default:
        network = "ethereum";
    }
  }

  // Return the prepared data
  return {
    address,
    network,
    country,
    signature,
    message,
  };
};
