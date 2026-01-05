
import { base } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";

export const BASE: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            coingeckoId: "usd-coin"
        },
        {
            name: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        }
    ],
    evm: {
        chain: base,
        rpcUrl: "https://base-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN",
        supports7702: true,
        erc4337: false,
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            cCTPInformation: {
                supportCCTP: true,
                domain: 6,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep141:base.omft.near",
                    name: "ETH",
                    decimals: 18
                }
            ],
            needMemo: false
        }
    }
}
