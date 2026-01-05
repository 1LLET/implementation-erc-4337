
import { avalanche } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";

export const AVALANCHE: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
            coingeckoId: "usd-coin"
        },
        {
            name: "AVAX",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "avalanche-2"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
            coingeckoId: "tether"
        }
    ],
    evm: {
        chain: avalanche,
        rpcUrl: avalanche.rpcUrls.default.http[0],
        supports7702: false,
        erc4337: false,
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            cCTPInformation: {
                supportCCTP: true,
                domain: 1,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep245:v2_1.omni.hot.tg:43114_3atVJH3r5c4GqiSYmg9fECvjc47o",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:43114_11111111111111111111",
                    name: "AVAX",
                    decimals: 18
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:43114_372BeH7ENZieCaabwkbWkBiTTgXp",
                    name: "USDT",
                    decimals: 6
                }
            ],
            needMemo: false
        }
    }
}
