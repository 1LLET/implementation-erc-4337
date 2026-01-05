
import { worldchain } from "viem/chains";
import { Address } from "abitype";
import { ChainConfig } from "../../types/chain.js";

export const WORLD_CHAIN: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x79A02482A880bCe3F13E09da970dC34dB4cD24D1",
            coingeckoId: "usd-coin"
        }
    ],
    evm: {
        chain: worldchain,
        rpcUrl: worldchain.rpcUrls.default.http[0],
        supports7702: true,
        erc4337: false,
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: false,
            cCTPInformation: {
                supportCCTP: true,
                domain: 14,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: null
    }
}
