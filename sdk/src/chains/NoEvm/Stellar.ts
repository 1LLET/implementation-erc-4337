
import { Networks } from "stellar-sdk";
import { ChainConfig } from "../../types/chain.js";

export const STELLAR: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 7,
            address: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
            coingeckoId: "usd-coin"
        },
        {
            name: "XLM",
            decimals: 7,
            address: "native",
            coingeckoId: "stellar"
        }
    ],
    nonEvm: {
        networkPassphrase: Networks.PUBLIC,
        serverURL: "https://horizon.stellar.org",
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: false,
            aproxFromFee: 0
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep245:v2_1.omni.hot.tg:1100_111bzQBB65GxAPAVoxqmMcgYo5oS3txhqs1Uh1cgahKQUeTUq1TJu",
                    name: "USDC",
                    decimals: 7
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:1100_111bzQBB5v7AhLyPMDwS8uJgQV24KaAPXtwyVWu2KXbbfQU6NXRCz",
                    name: "XLM",
                    decimals: 6
                }
            ],
            needMemo: true
        }
    }
};
