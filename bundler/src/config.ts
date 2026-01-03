import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

export interface Config {
  chainId: number;
  chain: Chain;
  rpcUrl: string;
  bundlerPrivateKey: `0x${string}`;
  entryPointAddress: `0x${string}`;
  factoryAddress: `0x${string}`;
  paymasterAddress: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

// Cache clients to avoid creating too many instances
const clientCache: Record<string, { publicClient: PublicClient; walletClient: WalletClient }> = {};

// Helper to load deployments dynamically
function loadDeployments(): Record<string, any> {
  const deploymentsPath = path.resolve(__dirname, "../../contracts/deployments.json");
  try {
    if (fs.existsSync(deploymentsPath)) {
      // Don't cache for dev iteration speed
      return JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    } else {
      console.warn(`[WARN] deployments.json not found at ${deploymentsPath}`);
    }
  } catch (e) {
    console.error("Error loading deployments.json", e);
  }
  return {};
}

export function getChainConfig(chainName: string): Config {
  // Normalize chain name
  const network = chainName.toLowerCase();

  // Resolve Chain object from viem or custom
  // We try to find it in viem/chains by name matches
  let chain: Chain | undefined = (chains as any)[network];

  // Fallback for some common names if viem names differ slightly (e.g. bsc vs bscMainnet? viem usually uses 'bsc')
  if (!chain) {
    // iterate all chains to find by id? NO, too slow.
    throw new Error(`Chain '${network}' not found in viem/chains definitions.`);
  }

  // Get addresses from deployments.json
  const deployments = loadDeployments(); // Load fresh on every call
  const deployment = deployments[network];
  if (!deployment) {
    // Only throw if strictly required, or maybe we allow operation without paymaster? 
    // For this specific use case, we NEED the paymaster address.
    throw new Error(`No deployment found for network '${network}' in deployments.json`);
  }

  const paymasterAddress = deployment["SponsorPaymaster"] as `0x${string}`;
  const entryPointAddress = (deployment["EntryPoint"] || "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789") as `0x${string}`;
  const factoryAddress = (deployment["SmartAccountFactory"] || process.env.FACTORY_ADDRESS || "0xe52553Fa5Cb212017b040c3678da2EC282963167") as `0x${string}`;

  // RPC URL: Try ENV first (e.g. ARBITRUM_RPC), then chain default
  const envKey = `${network.toUpperCase()}_RPC`;
  const rpcUrl = process.env[envKey] || chain.rpcUrls.default.http[0];

  const bundlerPrivateKey = process.env.BUNDLER_PRIVATE_KEY as `0x${string}`;
  if (!bundlerPrivateKey) throw new Error("BUNDLER_PRIVATE_KEY is not set");

  // Get or create clients
  if (!clientCache[network]) {
    const account = privateKeyToAccount(bundlerPrivateKey);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    }) as WalletClient;

    clientCache[network] = { publicClient, walletClient };
  }

  return {
    chainId: chain.id,
    chain,
    rpcUrl,
    bundlerPrivateKey,
    entryPointAddress,
    factoryAddress,
    paymasterAddress,
    publicClient: clientCache[network].publicClient,
    walletClient: clientCache[network].walletClient,
  };
}
