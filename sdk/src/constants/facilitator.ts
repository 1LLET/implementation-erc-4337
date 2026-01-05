import { Address } from "viem";
import { ChainKey } from "@/types/chain";
import { FacilitatorNetworkConfig } from "@/services/config";

export type FacilitatorChainKey = ChainKey;

export const calculateFee = (): bigint => {
    // Basic implementation or fetch from ENV
    return BigInt(10000); // 0.01 USDC
};

// Placeholder configuration. User needs to populate this.
export const FACILITATOR_NETWORKS: Record<string, FacilitatorNetworkConfig> = {
    // Example:
    // Base: {
    //     chainId: 8453,
    //     chain: undefined, // Need importing from viem/chains
    //     usdc: "0x...",
    //     usdcName: "USDC",
    //     usdcVersion: "1",
    //     domain: 6,
    //     tokenMessenger: "0x...",
    //     messageTransmitter: "0x...",
    //     rpcUrl: "https://..."
    // }
};
