import {
    base,
    baseSepolia,
    gnosis,
    optimism,
    optimismSepolia,
    arbitrum,
    polygon,
    bsc,
    avalanche,
    unichain,
    monad
} from "viem/chains";

export const CHAIN_ID_TO_KEY: Record<string, string> = {
    [base.id]: "Base",
    [baseSepolia.id]: "Base",
    [gnosis.id]: "Gnosis",
    [optimism.id]: "Optimism",
    [optimismSepolia.id]: "Optimism",
    [arbitrum.id]: "Arbitrum",
    [polygon.id]: "Polygon",
    [bsc.id]: "Binance",
    [avalanche.id]: "Avalanche",
    [unichain.id]: "Unichain",
    [monad.id]: "Monad",
    "9000": "Stellar"
};
