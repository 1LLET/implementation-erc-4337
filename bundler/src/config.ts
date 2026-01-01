import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "BASE_SEPOLIA_RPC",
  "BUNDLER_PRIVATE_KEY",
  "ENTRYPOINT_ADDRESS",
  "FACTORY_ADDRESS",
  "PAYMASTER_ADDRESS",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  rpcUrl: process.env.BASE_SEPOLIA_RPC!,
  bundlerPrivateKey: process.env.BUNDLER_PRIVATE_KEY! as `0x${string}`,
  entryPointAddress: process.env.ENTRYPOINT_ADDRESS! as `0x${string}`,
  factoryAddress: process.env.FACTORY_ADDRESS! as `0x${string}`,
  paymasterAddress: process.env.PAYMASTER_ADDRESS! as `0x${string}`,
  chainId: 84532,
};

// Bundler account (pays for gas)
export const bundlerAccount = privateKeyToAccount(config.bundlerPrivateKey);

// Public client for reading blockchain state
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

// Wallet client for sending transactions
export const walletClient = createWalletClient({
  account: bundlerAccount,
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});
