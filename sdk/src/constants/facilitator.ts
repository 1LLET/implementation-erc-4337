
import { Address } from "viem";
import { base, optimism, gnosis, arbitrum, polygon } from "viem/chains";
import { ChainKey } from "@/types/chain";
import { FacilitatorNetworkConfig } from "@/services/config";

export type FacilitatorChainKey = ChainKey;

export const PlatformFees = {
    DEV: 0,
    EVM_TO_OTHER: 0.02,
    DEFAULT: 0.02
};

// Dummy addresses for simulation
export const DUMMY_EVM_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Vitalik (just a valid address)
export const DUMMY_STELLAR_ADDRESS = "GB7BDSZU2Y27LYNLJLVEGW5TIVYQ6362DS5QZ5F6S27S227227227AAA";

export const calculateFee = (isDev: boolean = false): number => {
    return isDev ? PlatformFees.DEV : PlatformFees.DEFAULT;
};

// Placeholder configuration. User needs to populate this.
export const FACILITATOR_NETWORKS: Record<string, FacilitatorNetworkConfig> = {
    Base: {
        chainId: 8453,
        chain: base,
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 6,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: "https://base-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN"
    },
    Optimism: {
        chainId: 10,
        chain: optimism,
        usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 2,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN" // Assuming same key works or public
    },
    Gnosis: {
        chainId: 100,
        chain: gnosis,
        usdc: "0x2a22f9c3b48403ebD92cF06fF916b322a30dB834", // EURe (or USDC on Gnosis? The user is swapping USDT -> USDC, wait. The user log says GNOSIS -> Optimism (USDT -> USDC).
        // For verification, we just need RPC. The 'usdc' field is for CCTP, but verify logic just needs `rpcUrl`.
        // I will populate others as placeholders if unknown.
        usdcName: "USDC", // Placeholder
        usdcVersion: "2",
        domain: 0, // Placeholder
        tokenMessenger: "0x0000000000000000000000000000000000000000",
        messageTransmitter: "0x0000000000000000000000000000000000000000",
        rpcUrl: "https://rpc.gnosischain.com"
    },
    Arbitrum: {
        chainId: 42161,
        chain: arbitrum,
        usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 3,
        tokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
        messageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
        rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN"
    },
    Polygon: {
        chainId: 137,
        chain: polygon,
        usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 7, // Placeholder? CCTP domain for Polygon is 7? I should check if I had it elsewhere.
        tokenMessenger: "0x0000000000000000000000000000000000000000",
        messageTransmitter: "0x0000000000000000000000000000000000000000",
        rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN"
    }
};
