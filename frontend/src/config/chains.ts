import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA, GNOSIS_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};

// -- Base Sepolia --
// Use internal API route by default
availableChains["baseSepolia"] = {
    ...BASE_SEPOLIA,
    bundlerUrl: "/api/rpc?chain=baseSepolia"
};

// -- Base Mainnet --
availableChains["base"] = {
    ...BASE_MAINNET,
    bundlerUrl: "/api/rpc?chain=base"
};

// -- Gnosis Mainnet --
availableChains["gnosis"] = {
    ...GNOSIS_MAINNET,
    bundlerUrl: "/api/rpc?chain=gnosis"
};

// Helper for other chains if needed (Optional, user focused on Base)

export const defaultChainKey = "baseSepolia";
