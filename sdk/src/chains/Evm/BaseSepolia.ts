import { baseSepolia } from "viem/chains";
import { ChainConfig } from "../../types/chain.js";
import { BUNDLER_URL } from "../../constants/bundler";

export const BASE_SEPOLIA: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
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
        chain: baseSepolia,
        rpcUrl: "https://sepolia.base.org",
        supports7702: true,
        erc4337: true,
        bundlerUrl: `${BUNDLER_URL}/rpc?chain=baseSepolia`,
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
        // Paymaster optional
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: false,
            aproxFromFee: 0,
            cCTPInformation: {
                supportCCTP: false,
                domain: 0, // Mock
            },
        },
        nearIntentInformation: {
            support: false, // Assuming false for testnet unless known
            assetsId: [],
            needMemo: false
        }
    }
}
