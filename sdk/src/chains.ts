import { type ChainConfig } from "./types";
import { base, baseSepolia, gnosis, optimism } from "viem/chains";

const DEFAULT_BUNDLER_URL = "https://bundler-erc-4337.vercel.app";
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || process.env.BUNDLER_URL || DEFAULT_BUNDLER_URL;


export const BASE_MAINNET: ChainConfig = {
    chain: base,
    bundlerUrl: `${BUNDLER_URL}/rpc?chain=base`, // Dynamic Bundler URL

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

export const OPTIMISM_MAINNET: ChainConfig = {
    chain: optimism,
    bundlerUrl: `${BUNDLER_URL}/rpc?chain=optimism`, // Dynamic Bundler URL

    // Addresses
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    factoryAddress: "0x3CE963866d3Be7Fe4354DBe892Aab52a0a18aeb2",
    paymasterAddress: "0x0dB771d11F84E8541AA651363DF14E4401d01216",

    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        },
        {
            symbol: "USDT",
            decimals: 6,
            address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
        },
        {
            symbol: "OP",
            decimals: 18,
            address: "0x4200000000000000000000000000000000000042",
        },
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000"
        }
    ]
};

export const GNOSIS_MAINNET: ChainConfig = {
    chain: gnosis,
    bundlerUrl: `${BUNDLER_URL}/rpc?chain=gnosis`, // Dynamic Bundler URL

    // Addresses
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    factoryAddress: "0xC8a2Fb1f2E686417A131E09be3320cb5431CcD90",
    paymasterAddress: "0x4C36C70d68a7c26326711e8268bb163E3784fA96",

    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0"
        },
        {
            symbol: "USDT",
            decimals: 6,
            address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6"
        },
        {
            symbol: "EURe",
            decimals: 18,
            address: "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430"
        },
        {
            symbol: "GNO",
            decimals: 18,
            address: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb"
        },
        {
            symbol: "WETH",
            decimals: 18,
            address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1"
        },
        {
            symbol: "XDAI",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000"
        }
    ]
};

export const BASE_SEPOLIA: ChainConfig = {
    chain: baseSepolia,
    bundlerUrl: `${BUNDLER_URL}/rpc?chain=baseSepolia`, // Dynamic Bundler URL

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
    [baseSepolia.id]: BASE_SEPOLIA,
    [gnosis.id]: GNOSIS_MAINNET,
    [optimism.id]: OPTIMISM_MAINNET
};
