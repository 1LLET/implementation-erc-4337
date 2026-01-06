import { Address } from "abitype";
import z from "zod";

export const ChainKeyEnum = z.enum([
    "Optimism",
    "Arbitrum",
    "Base",
    "Unichain",
    "Polygon",
    "Avalanche",
    "WorldChain",
    "Stellar",
    "Monad",
    "BNB",
    "GNOSIS"
]);

export type ChainKey = z.infer<typeof ChainKeyEnum>;

export interface NearIntentAsset {
    assetId: string,
    name: string,
    decimals: number,
}

export interface NearIntentInformation {
    support: boolean,
    assetsId: NearIntentAsset[],
    needMemo: boolean
}

export interface CCTPInformation {
    supportCCTP: boolean;
    domain: number;
}

export interface CircleInformation {
    supportCirclePaymaster: boolean;
    cCTPInformation?: CCTPInformation;
    aproxFromFee: number;
}

export interface CrossChainInformation {
    circleInformation?: CircleInformation;
    nearIntentInformation: NearIntentInformation | null;
}

export interface EvmInformation {
    chain: any;
    rpcUrl: string | null;
    supports7702: boolean;
    erc4337: boolean;
    bundlerUrl?: string;
    entryPointAddress?: Address;
    factoryAddress?: Address;
    paymasterAddress?: Address;
}

export interface NonEvmInformation {
    networkPassphrase?: string;
    serverURL?: string;
}

export interface Asset {
    name: string;
    decimals: number;
    address?: Address | string;
    coingeckoId?: string;
}

export interface ChainConfig {
    assets: Asset[];

    evm?: EvmInformation;
    nonEvm?: NonEvmInformation;

    crossChainInformation: CrossChainInformation;
}
