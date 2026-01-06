import { gnosis } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";
import { BUNDLER_URL } from "../../constants/bundler";

export const GNOSIS: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0",
            coingeckoId: "usd-coin"
        },
        {
            name: "USDT",
            decimals: 6,
            address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
            coingeckoId: "tether"
        },
        {
            name: "EURe",
            decimals: 18,
            address: "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430",
            coingeckoId: "monerium-eur-money"
        },
        {
            name: "GNO",
            decimals: 18,
            address: "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb",
            coingeckoId: "gnosis"
        },
        {
            name: "WETH",
            decimals: 18,
            address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
            coingeckoId: "ethereum"
        },
        {
            name: "XDAI",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000",
            coingeckoId: "xdai"
        }
    ],
    evm: {
        chain: gnosis,
        rpcUrl: gnosis.rpcUrls.default.http[0],
        supports7702: true,
        erc4337: true,
        bundlerUrl: `${BUNDLER_URL}/rpc?chain=gnosis`,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0xC8a2Fb1f2E686417A131E09be3320cb5431CcD90",
        paymasterAddress: "0x4C36C70d68a7c26326711e8268bb163E3784fA96"
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: false,
            aproxFromFee: 0,
            cCTPInformation: {
                supportCCTP: false,
                domain: 0,
            },
        },
        nearIntentInformation: {
            support: true,
            assetsId: [
                {
                    assetId: "nep141:gnosis-0x2a22f9c3b484c3629090feed35f17ff8f88f76f0.omft.near",
                    name: "USDC",
                    decimals: 6
                },
                {
                    assetId: "nep141:gnosis-0x4ecaba5870353805a9f068101a40e0f32ed605c6.omft.near",
                    name: "USDT",
                    decimals: 6
                },
                {
                    assetId: "nep141:gnosis-0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430.omft.near",
                    name: "EURe",
                    decimals: 18
                },
                {
                    assetId: "nep141:gnosis-0x9c58bacc331c9aa871afd802db6379a98e80cedb.omft.near",
                    name: "GNO",
                    decimals: 18
                },
                {
                    assetId: "nep141:gnosis-0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1.omft.near",
                    name: "WETH",
                    decimals: 18
                },
                {
                    assetId: "nep141:gnosis.omft.near",
                    name: "XDAI",
                    decimals: 18
                }
            ],
            needMemo: false
        }
    }
};
