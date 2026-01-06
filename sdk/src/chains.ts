import { type ChainConfig } from "./types";
import { type ChainConfig as ChainConfigData } from "./types/chain";
import { BASE } from "./chains/Evm/Base";
import { GNOSIS } from "./chains/Evm/Gnosis";
import { OPTIMISM } from "./chains/Evm/Optimism";
import { BASE_SEPOLIA as BASE_SEPOLIA_DATA } from "./chains/Evm/BaseSepolia";
import { base, baseSepolia, gnosis, optimism } from "viem/chains";

function mapToSDKConfig(data: ChainConfigData): ChainConfig {
    if (!data.evm) throw new Error("Non-EVM config used in EVM SDK");
    return {
        chain: data.evm.chain,
        rpcUrl: data.evm.rpcUrl || undefined,
        bundlerUrl: data.evm.bundlerUrl!,
        entryPointAddress: data.evm.entryPointAddress,
        factoryAddress: data.evm.factoryAddress,
        paymasterAddress: data.evm.paymasterAddress,
        tokens: data.assets.map(a => ({
            symbol: a.name,
            decimals: a.decimals,
            address: a.address as `0x${string}`
        }))
    };
}

export const BASE_MAINNET: ChainConfig = mapToSDKConfig(BASE);
export const OPTIMISM_MAINNET: ChainConfig = mapToSDKConfig(OPTIMISM);
export const GNOSIS_MAINNET: ChainConfig = mapToSDKConfig(GNOSIS);
export const BASE_SEPOLIA: ChainConfig = mapToSDKConfig(BASE_SEPOLIA_DATA);

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
    [base.id]: BASE_MAINNET,
    [baseSepolia.id]: BASE_SEPOLIA,
    [gnosis.id]: GNOSIS_MAINNET,
    [optimism.id]: OPTIMISM_MAINNET
};

