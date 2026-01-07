import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA, GNOSIS_MAINNET, OPTIMISM_MAINNET, STELLAR_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};




// -- Base Sepolia --
// Clone and override bundlerUrl if env var is set
// -- Base Sepolia --
availableChains[BASE_SEPOLIA.chain.id] = {
    ...BASE_SEPOLIA,
    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            coingeckoId: "usd-coin"
        } as any,
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        } as any
    ],
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=baseSepolia`
        : BASE_SEPOLIA.bundlerUrl
};

// -- Base Mainnet --
availableChains[BASE_MAINNET.chain.id] = {
    ...BASE_MAINNET,
    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            coingeckoId: "usd-coin"
        } as any,
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        } as any
    ],
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=base`
        : BASE_MAINNET.bundlerUrl
};

// -- Gnosis Mainnet --
availableChains[GNOSIS_MAINNET.chain.id] = {
    ...GNOSIS_MAINNET,
    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0",
            coingeckoId: "usd-coin"
        } as any,
        {
            symbol: "USDT",
            decimals: 6,
            address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
            coingeckoId: "tether"
        } as any,
        {
            symbol: "EURe",
            decimals: 18,
            address: "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430",
            coingeckoId: "monerium-eur-money"
        } as any,
        {
            symbol: "GNO",
            decimals: 18,
            address: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
            coingeckoId: "gnosis"
        } as any,
        {
            symbol: "WETH",
            decimals: 18,
            address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
            coingeckoId: "ethereum"
        } as any,
        {
            symbol: "XDAI",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "xdai"
        } as any
    ],
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=gnosis`
        : GNOSIS_MAINNET.bundlerUrl
};

// -- Optimism Mainnet --
availableChains[OPTIMISM_MAINNET.chain.id] = {
    ...OPTIMISM_MAINNET,
    tokens: [
        {
            symbol: "USDC",
            decimals: 6,
            address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
            coingeckoId: "usd-coin"
        } as any,
        {
            symbol: "USDT",
            decimals: 6,
            address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
            coingeckoId: "tether"
        } as any,
        {
            symbol: "OP",
            decimals: 18,
            address: "0x4200000000000000000000000000000000000042",
            coingeckoId: "optimism"
        } as any,
        {
            symbol: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        } as any
    ],
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `${process.env.NEXT_PUBLIC_BUNDLER_URL}/rpc?chain=optimism`
        : OPTIMISM_MAINNET.bundlerUrl
};

// -- Stellar Mainnet --
availableChains[STELLAR_MAINNET.chain.id] = {
    ...STELLAR_MAINNET,
    tokens: [
        {
            symbol: "USDC",
            decimals: 7,
            address: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
            coingeckoId: "usd-coin"
        } as any,
        {
            symbol: "XLM",
            decimals: 7,
            address: "native",
            coingeckoId: "stellar"
        } as any
    ]
};

// Helper for other chains if needed (Optional, user focused on Base)

export const defaultChainKey = BASE_SEPOLIA.chain.id.toString();
