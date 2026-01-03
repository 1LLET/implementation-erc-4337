import { type ChainConfig } from "./types";
import { base, baseSepolia } from "viem/chains";

export const BASE_MAINNET: ChainConfig = {
    chain: base,
    bundlerUrl: "http://localhost:3000/rpc?chain=base", // Default to local bundler pattern

    // Addresses
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    factoryAddress: "0xe2584152891E4769025807DEa0cD611F135aDC68",
    paymasterAddress: "0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95",

    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        },
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000"
        }
    ]
};

export const BASE_SEPOLIA: ChainConfig = {
    chain: baseSepolia,
    bundlerUrl: "http://localhost:3000/rpc?chain=baseSepolia", // Default to local bundler pattern

    // Addresses
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
    // Paymaster not configured in deployments.ts for Sepolia?

    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        },
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000"
        }
    ]
};

// Map accessible by ChainID
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
    [base.id]: BASE_MAINNET,
    [baseSepolia.id]: BASE_SEPOLIA
};
