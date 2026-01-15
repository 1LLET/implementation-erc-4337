import { type ChainConfig, BASE_MAINNET, BASE_SEPOLIA, GNOSIS_MAINNET, OPTIMISM_MAINNET, STELLAR_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";

export const availableChains: Record<string, ChainConfig> = {};




// Helper to transform SDK ChainConfig to Frontend format
function configureChain(sdkChain: ChainConfig, chainKey: string) {
    // Override/Set bundler URL if env var is present
    const envBundler = process.env.NEXT_PUBLIC_BUNDLER_URL;
    const chainAny = sdkChain as any;

    const bundlerUrl = envBundler
        ? `${envBundler}/rpc?chain=${chainKey}`
        : chainAny.evm?.bundlerUrl || chainAny.bundlerUrl; // Support both location if changed in SDK or spread

    // Map SDK 'assets' (name) or 'tokens' (symbol) to Frontend 'tokens'
    // and ensure coingeckoId is passed through if available
    const source = chainAny.assets || chainAny.tokens || [];
    const tokens = source.map((item: any) => ({
        symbol: item.name || item.symbol,
        decimals: item.decimals,
        address: item.address,
        coingeckoId: item.coingeckoId
    }));

    return {
        ...sdkChain,
        tokens,
        bundlerUrl
    };
}

// -- Base Sepolia --
availableChains[BASE_SEPOLIA.chain.id] = configureChain(BASE_SEPOLIA, "baseSepolia");

// -- Base Mainnet --
availableChains[BASE_MAINNET.chain.id] = configureChain(BASE_MAINNET, "base");

// -- Gnosis Mainnet --
availableChains[GNOSIS_MAINNET.chain.id] = configureChain(GNOSIS_MAINNET, "gnosis");

// -- Optimism Mainnet --
availableChains[OPTIMISM_MAINNET.chain.id] = configureChain(OPTIMISM_MAINNET, "optimism");

// -- Stellar Mainnet --
// Stellar might not have 'chain.id' in the same way or bundlerUrl logic might differ, 
// but based on previous code it uses STELLAR_MAINNET.chain.id
// And it doesn't utilize bundlerUrl in the same EVM way, but consistent structure helps.
availableChains[STELLAR_MAINNET.chain.id] = configureChain(STELLAR_MAINNET, "stellar");

// Helper for other chains if needed (Optional, user focused on Base)

export const defaultChainKey = BASE_SEPOLIA.chain.id.toString();
