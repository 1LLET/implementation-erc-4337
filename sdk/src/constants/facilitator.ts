
import { base, optimism, gnosis, arbitrum, polygon, unichain, avalanche, worldchain, monad } from "viem/chains";
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
        usdc: "0x2a22f9c3b48403ebD92cF06fF916b322a30dB834",
        usdcName: "USDC",
        usdcVersion: "2",
        domain: 0,
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
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN"
    },
    Polygon: {
        chainId: 137,
        chain: polygon,
        usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 7,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN"
    },
    Unichain: {
        chainId: unichain.id,
        chain: unichain,
        usdc: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 10,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: unichain.rpcUrls.default.http[0]
    },
    Avalanche: {
        chainId: avalanche.id,
        chain: avalanche,
        usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 1,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: avalanche.rpcUrls.default.http[0]
    },
    Worldchain: {
        chainId: worldchain.id,
        chain: worldchain,
        usdc: "0x79A02482A880bCe3F13E09da970dC34dB4cD24D1",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 13,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: worldchain.rpcUrls.default.http[0]
    },
    Monad: {
        chainId: monad.id,
        chain: monad,
        usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
        usdcName: "USD Coin",
        usdcVersion: "2",
        domain: 15,
        tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
        messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
        rpcUrl: monad.rpcUrls.default.http[0]
    }
};
