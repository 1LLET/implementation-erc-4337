import { type Address, type Chain } from "viem";
import { base, baseSepolia, arbitrum, optimism } from "viem/chains";
import { type ChainConfig, DEPLOYMENTS } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};

// Helper to populate config
function createChainConfig(
    chain: Chain,
    networkName: string,
    rpcUrl?: string
): ChainConfig {
    // We can explicitly look up known deployments to expose usdcAddress to the UI if needed
    // The SDK itself processes this automatically in the constructor, but we'll set it here
    // so the frontend UI (like UsdcInfo) can access it easily.
    const knownDeployment = DEPLOYMENTS[chain.id];

    return {
        chain,
        rpcUrl: rpcUrl || chain.rpcUrls.default.http[0],
        bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
            ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}?chain=${networkName}`
            : `http://localhost:3000/rpc?chain=${networkName}`,
        // Addresses below are optional since SDK v0.1.2+.
        // The SDK resolves them automatically.
        // We only provide usdcAddress if known, for UI convenience.
        usdcAddress: knownDeployment?.usdc,
    };
}

// -- Base Sepolia --
availableChains["baseSepolia"] = createChainConfig(baseSepolia, "baseSepolia");

// -- Base Mainnet --
availableChains["base"] = createChainConfig(
    base,
    "base",
    "https://base.publicnode.com" // Reliable public RPC
);

// -- Arbitrum --
availableChains["arbitrum"] = createChainConfig(arbitrum, "arbitrum");

// -- Optimism --
availableChains["optimism"] = createChainConfig(optimism, "optimism");

export const defaultChainKey = "baseSepolia";
