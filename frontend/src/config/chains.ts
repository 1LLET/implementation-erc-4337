import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA, GNOSIS_MAINNET, OPTIMISM_MAINNET, STELLAR_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};

// -- Base Sepolia --
// Clone and override bundlerUrl if env var is set
availableChains[BASE_SEPOLIA.chain.id] = {
    ...BASE_SEPOLIA,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=baseSepolia`
        : BASE_SEPOLIA.bundlerUrl
};

// -- Base Mainnet --
availableChains[BASE_MAINNET.chain.id] = {
    ...BASE_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=base`
        : BASE_MAINNET.bundlerUrl
};

// -- Gnosis Mainnet --
availableChains[GNOSIS_MAINNET.chain.id] = {
    ...GNOSIS_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=gnosis`
        : GNOSIS_MAINNET.bundlerUrl
};

availableChains[OPTIMISM_MAINNET.chain.id] = {
    ...OPTIMISM_MAINNET,
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=optimism`
        : OPTIMISM_MAINNET.bundlerUrl
};

availableChains[STELLAR_MAINNET.chain.id] = STELLAR_MAINNET;

// Helper for other chains if needed (Optional, user focused on Base)

export const defaultChainKey = BASE_SEPOLIA.chain.id.toString();
