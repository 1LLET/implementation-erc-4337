
import { polygon } from "viem/chains";
import { Address } from "abitype";
import { ChainConfig } from "../../types/chain.js";

export const POLYGON: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            coingeckoId: "usd-coin"
        },
        {
            name: "POL",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "polygon-ecosystem-token"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            coingeckoId: "tether"
        }
    ],
    evm: {
        chain: polygon,
        rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN",
        supports7702: true,
        erc4337: false,
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            cCTPInformation: {
                supportCCTP: true,
                domain: 7,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep245:v2_1.omni.hot.tg:137_qiStmoQJDQPTebaPjgx5VBxZv6L",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:137_11111111111111111111",
                    name: "POL",
                    decimals: 18
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:137_3hpYoaLtt8MP1Z2GH1U473DMRKgr",
                    name: "USDT",
                    decimals: 6
                }
            ],
            needMemo: false
        }
    }
}
