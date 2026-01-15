import { BUNDLER_URL } from "../../constants/bundler";
import { arbitrum } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";

export const ARBITRUM: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            coingeckoId: "usd-coin"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            coingeckoId: "tether"
        },
        {
            name: "ARB",
            decimals: 18,
            address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
            coingeckoId: "arbitrum"
        },
        {
            name: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        }
    ],
    evm: {
        chain: arbitrum,
        rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN",
        bundlerUrl: `${BUNDLER_URL}/rpc?chain=arbitrum`,
        supports7702: true,
        erc4337: false,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0xEEba846e0177CD7b2F023feaa44F9B2a9183327A",
        paymasterAddress: "0x41d236E76eCEC3b90554d0b504ac2EEce93A2AE1",
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            aproxFromFee: 0,
            cCTPInformation: {
                supportCCTP: true,
                domain: 3,
            },
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near",
                    name: "USDT",
                    decimals: 6
                },
                {
                    assetId: "nep141:arb.omft.near",
                    name: "ETH",
                    decimals: 18
                },
                {
                    assetId: "nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near",
                    name: "ARB",
                    decimals: 18
                }
            ],
            needMemo: false
        }
    }
};
