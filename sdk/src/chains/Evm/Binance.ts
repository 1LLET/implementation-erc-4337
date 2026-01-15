
import { bsc } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";

export const BNB: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 18,
            address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // BSC Mainnet USDC
            coingeckoId: "usd-coin"
        },
        {
            name: "USDT",
            decimals: 18,
            address: "0x55d398326f99059fF775485246999027B3197955", // BSC Mainnet USDT
            coingeckoId: "tether"
        },
        {
            name: "BNB",
            decimals: 18,
            address: "0x0000000000000000000000000000000000000000", // Native
            coingeckoId: "binancecoin"
        },
    ],
    evm: {
        chain: bsc,
        rpcUrl: "https://bsc-dataseed.binance.org",
        supports7702: true,
        erc4337: false,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0x2d5dBD90d3aB35614cdf686a67A9889E56B20b27",
        paymasterAddress: "0x460593321DdbE4e1038666Ad07Fc1F817dfA02DB",
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
            needMemo: false,
            assetsId: [
                {
                    name: "USDC",
                    assetId: "nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r",
                    decimals: 18,
                },
                {
                    name: "USDT",
                    assetId: "nep245:v2_1.omni.hot.tg:56_2CMMyVTGZkeyNZTSvS5sarzfir6g",
                    decimals: 18,
                },
                {
                    name: "BNB",
                    assetId: "nep245:v2_1.omni.hot.tg:56_11111111111111111111",
                    decimals: 18,
                }
            ],
        },
    },
};
