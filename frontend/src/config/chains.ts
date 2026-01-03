import { type Address, type Chain } from "viem";
import { base, baseSepolia, arbitrum, mainnet, optimism, polygon, sepolia } from "viem/chains";
import deployments from "../../../contracts/deployments.json";

export interface ChainConfig {
    chain: Chain;
    rpcUrl: string;
    bundlerUrl: string;
    entryPointAddress: Address;
    factoryAddress: Address;
    paymasterAddress: Address;
    usdcAddress: Address;
}

// Default addresses if not in deployments.json (fallbacks)
const DEFAULT_ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const DEFAULT_FACTORY = "0x9406Cc6185a346906296840746125a0E44976454"; // SimpleAccountFactory v0.6

export const availableChains: Record<string, ChainConfig> = {};

// Helper to populate config from deployments or defaults
function createChainConfig(
    chain: Chain,
    networkName: string,
    usdcAddress: Address,
    rpcUrl?: string
): ChainConfig {
    const deployment = (deployments as any)[networkName];

    return {
        chain,
        rpcUrl: rpcUrl || chain.rpcUrls.default.http[0],
        bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
            ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}?chain=${networkName}`
            : `http://localhost:3000/rpc?chain=${networkName}`,
        entryPointAddress: (deployment?.EntryPoint || DEFAULT_ENTRYPOINT) as Address,
        factoryAddress: (deployment?.SmartAccountFactory || DEFAULT_FACTORY) as Address,
        paymasterAddress: (deployment?.SponsorPaymaster || "") as Address, // Paymaster MUST be deployed
        usdcAddress,
    };
}

// -- Base Sepolia --
availableChains["baseSepolia"] = createChainConfig(
    baseSepolia,
    "baseSepolia",
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // USDC on Base Sepolia
);

// -- Base Mainnet --
availableChains["base"] = createChainConfig(
    base,
    "base",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base Mainnet
    "https://base.publicnode.com" // Reliable public RPC
);

// -- Arbitrum --
// Note: You need to deploy paymaster to Arbitrum first for this to work fully
availableChains["arbitrum"] = createChainConfig(
    arbitrum,
    "arbitrum",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" // USDC on Arbitrum One
);

// -- Optimism --
availableChains["optimism"] = createChainConfig(
    optimism,
    "optimism",
    "0x0b2C639c533813f4Aa9D7837CAf992c92bd58K1d" // USDC on Optimism
);

export const defaultChainKey = "baseSepolia";
