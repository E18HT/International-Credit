import { createConfig, http } from "wagmi";
import {
  mainnet,
  sepolia,
  polygon,
  arbitrum,
  hedera,
  hederaTestnet,
} from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// Get projectId from https://cloud.walletconnect.com
export const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "8c963e6e044549c04fdc38419fd26a01";

// Create wagmi config
export const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, hederaTestnet, hedera],
  connectors: [injected(), metaMask(), walletConnect({ projectId })],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [hederaTestnet.id]: http(),
    [hedera.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
