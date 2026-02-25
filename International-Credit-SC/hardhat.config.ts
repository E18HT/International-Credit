import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    hedera: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : [],
      gas: 10000000,
      gasPrice: 400000000000, // 400 Gwei - Hedera minimum gas price
    },
  },
  etherscan: {
    apiKey: {
      hedera: "YOUR_HEDERA_API_KEY", // Placeholder - Hedera doesn't use API keys for verification
    },
    customChains: [
      {
        network: "hedera",
        chainId: 296,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/testnet",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};

export default config;
