import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import {
  base,
  baseSepolia,
  gnosis,
  polygon,
  bsc,
  optimism,
  avalanche,
  arbitrum,
  unichain,
  monad
} from "viem/chains";

import * as path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    base: {
      url: process.env.BASE_MAINNET_RPC || base.rpcUrls.default.http[0],
      chainId: base.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || baseSepolia.rpcUrls.default.http[0],
      chainId: baseSepolia.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    gnosis: {
      url: process.env.GNOSIS_RPC || gnosis.rpcUrls.default.http[0],
      chainId: gnosis.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC || polygon.rpcUrls.default.http[0],
      chainId: polygon.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bsc: {
      url: process.env.BSC_RPC || bsc.rpcUrls.default.http[0],
      chainId: bsc.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    optimism: {
      url: process.env.OPTIMISM_RPC || optimism.rpcUrls.default.http[0],
      chainId: optimism.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC || "https://api.avax.network/ext/bc/C/rpc",
      chainId: avalanche.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000, // 25 gwei
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC || arbitrum.rpcUrls.default.http[0],
      chainId: arbitrum.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    unichain: {
      url: process.env.UNICHAIN_RPC || unichain.rpcUrls.default.http[0],
      chainId: unichain.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    monad: {
      url: process.env.MONAD_RPC || monad.rpcUrls.default.http[0],
      chainId: monad.id,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "PLACEHOLDER",
      baseSepolia: process.env.BASESCAN_API_KEY || "PLACEHOLDER",
      gnosis: process.env.GNOSISSCAN_API_KEY || "PLACEHOLDER",
      polygon: process.env.POLYGONSCAN_API_KEY || "PLACEHOLDER",
      bsc: process.env.BSCSCAN_API_KEY || "PLACEHOLDER",
      optimism: process.env.OPTIMISMSCAN_API_KEY || "PLACEHOLDER",
      avalanche: process.env.SNOWTRACE_API_KEY || "PLACEHOLDER",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "PLACEHOLDER",
      unichain: process.env.UNICHAIN_EXPLORER_API_KEY || "PLACEHOLDER",
      monad: process.env.MONAD_EXPLORER_API_KEY || "PLACEHOLDER",
    },
    customChains: [
      {
        network: "base",
        chainId: base.id,
        urls: {
          apiURL: base.blockExplorers?.default.apiUrl || "https://api.basescan.org/api",
          browserURL: base.blockExplorers?.default.url || "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: baseSepolia.id,
        urls: {
          apiURL: baseSepolia.blockExplorers?.default.apiUrl || "https://api-sepolia.basescan.org/api",
          browserURL: baseSepolia.blockExplorers?.default.url || "https://sepolia.basescan.org",
        },
      },
      {
        network: "gnosis",
        chainId: gnosis.id,
        urls: {
          apiURL: gnosis.blockExplorers?.default.apiUrl || "https://api.gnosisscan.io/api",
          browserURL: gnosis.blockExplorers?.default.url || "https://gnosisscan.io",
        },
      },
      {
        network: "unichain",
        chainId: unichain.id,
        urls: {
          apiURL: unichain.blockExplorers?.default.url + "/api",
          browserURL: unichain.blockExplorers?.default.url || "",
        }
      },
      {
        network: "monad",
        chainId: monad.id,
        urls: {
          apiURL: monad.blockExplorers?.default.url + "/api",
          browserURL: monad.blockExplorers?.default.url || "",
        }
      },
      {
        network: "arbitrum",
        chainId: arbitrum.id,
        urls: {
          apiURL: arbitrum.blockExplorers?.default.apiUrl || "https://api.arbiscan.io/api",
          browserURL: arbitrum.blockExplorers?.default.url || "https://arbiscan.io",
        }
      }
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
