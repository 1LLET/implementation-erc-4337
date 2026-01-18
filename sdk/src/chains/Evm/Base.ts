import { base } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";
import { BUNDLER_URL } from "../../constants/bundler";

export const BASE: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            coingeckoId: "usd-coin",
            supportsStargate: true
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
        bundlerUrl: `${BUNDLER_URL}/rpc?chain=base`,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0xe2584152891E4769025807DEa0cD611F135aDC68",
        paymasterAddress: "0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95"
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
        },
        stargateInformation: {
            support: true,
        }
    }
}
