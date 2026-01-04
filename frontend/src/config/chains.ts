import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA, GNOSIS_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};

// -- Base Sepolia --
// Clone and override bundlerUrl if env var is set
availableChains["baseSepolia"] = {
    ...BASE_SEPOLIA,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=baseSepolia`
        : BASE_SEPOLIA.bundlerUrl
};

// -- Base Mainnet --
availableChains["base"] = {
    ...BASE_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=base`
        : BASE_MAINNET.bundlerUrl
};

// -- Gnosis Mainnet --
availableChains["gnosis"] = {
    ...GNOSIS_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=gnosis`
        : GNOSIS_MAINNET.bundlerUrl
};

// Helper for other chains if needed (Optional, user focused on Base)

export const defaultChainKey = "baseSepolia";
