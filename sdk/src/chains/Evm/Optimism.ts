import { optimism } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";
import { BUNDLER_URL } from "../../constants/bundler";

export const OPTIMISM: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
            coingeckoId: "usd-coin"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
            coingeckoId: "tether"
        },
        {
            name: "OP",
            decimals: 18,
            address: "0x4200000000000000000000000000000000000042",
            coingeckoId: "optimism"
        },
        {
            name: "ETH",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "ethereum"
        }
    ],
    evm: {
        chain: optimism,
        rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN",
        supports7702: false,
        erc4337: false,
        bundlerUrl: `${BUNDLER_URL}/rpc?chain=optimism`,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0x3CE963866d3Be7Fe4354DBe892Aab52a0a18aeb2",
        paymasterAddress: "0x0dB771d11F84E8541AA651363DF14E4401d01216",
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            cCTPInformation: {
                supportCCTP: true,
                domain: 2,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep245:v2_1.omni.hot.tg:10_A2ewyUyDp6qsue1jqZsGypkCxRJ",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:10_359RPSJVdTxwTJT9TyGssr2rFoWo",
                    name: "USDT",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:10_vLAiSt9KfUGKpw5cD3vsSyNYBo7",
                    name: "OP",
                    decimals: 18
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:10_11111111111111111111",
                    name: "ETH",
                    decimals: 18
                }
            ],
            needMemo: false
        }
    }
}
