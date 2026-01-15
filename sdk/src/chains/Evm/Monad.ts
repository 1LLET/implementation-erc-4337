
import { monad } from "viem/chains";
import { Address } from "abitype";
import { ChainConfig } from "../../types/chain.js";

export const Monad: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
            coingeckoId: "usd-coin"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
            coingeckoId: "tether"
        },
        {
            name: "MON",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "monad"
        }
    ],
    evm: {
        chain: monad,
        rpcUrl: monad.rpcUrls.default.http[0],
        supports7702: true,
        erc4337: false,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0xaaeA6D8f377e62599Aad75376F0C5e4F7EBF8f84",
        paymasterAddress: "0xeA82B63e8dE3BFBd321A681D4511BC596E323162",
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: false,
            cCTPInformation: {
                supportCCTP: true,
                domain: 15,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et",
                    name: "USDT",
                    decimals: 6
                },
                {
                    assetId: "nep245:v2_1.omni.hot.tg:143_11111111111111111111",
                    name: "MON",
                    decimals: 18
                }
            ],
            needMemo: false
        }
    }
}
