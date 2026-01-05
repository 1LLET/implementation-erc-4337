
import { ChainKey } from "@/types/chain";
import { ChainConfig } from "@/types/chain";
import * as Chains from "@/chains/index";

export const NETWORKS: Record<string, ChainConfig> = {
    Optimism: Chains.OPTIMISM,
    Arbitrum: Chains.ARBITRUM,
    Base: Chains.BASE,
    Unichain: Chains.UNICHAIN,
    Polygon: Chains.POLYGON,
    Avalanche: Chains.AVALANCHE,
    WorldChain: Chains.WORLD_CHAIN,
    Stellar: Chains.STELLAR,
    Monad: Chains.Monad,
    BNB: Chains.BNB,
    GNOSIS: Chains.GNOSIS
};
