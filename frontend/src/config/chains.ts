import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA } from "@1llet.xyz/erc4337-gasless-sdk";
import { arbitrum, optimism } from "viem/chains";

export const availableChains: Record<string, ChainConfig> = {};

// -- Base Sepolia --
// Clone and override bundlerUrl if env var is set
availableChains["baseSepolia"] = {
    ...BASE_SEPOLIA,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}?chain=baseSepolia`
        : BASE_SEPOLIA.bundlerUrl
};

// -- Base Mainnet --
availableChains["base"] = {
    ...BASE_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}?chain=base`
        : BASE_MAINNET.bundlerUrl
};

// Helper for other chains if needed (Optional, user focused on Base)
// Leaving other chains empty or commented out for now as I don't have SDK configs for them yet.
// Or I can construct them manually matching the new interface if strictly needed.
// Given the user said "hazlo por el momento solo base", I will simply comment out others or provide minimal valid config?
// The user removed Arbitrum from SDK.
// I will keep existing logic for "arbitrum" but fix the type error if I can resolve addresses or just leave empty tokens for now?
// Actually simpler to just expose Base as requested.

export const defaultChainKey = "baseSepolia";
