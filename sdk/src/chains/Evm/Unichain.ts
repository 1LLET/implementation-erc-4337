
import { unichain } from "viem/chains";
import { Address } from "abitype";
import { ChainConfig } from "../../types/chain.js";

export const UNICHAIN: ChainConfig = {
    assets: [
        {
            name: "USDC",
            decimals: 6,
            address: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
            coingeckoId: "usd-coin"
        }
    ],
    evm: {
        chain: unichain,
        rpcUrl: "https://unichain-mainnet.g.alchemy.com/v2/49fUGmuW05ynCui0VEvDN",
        supports7702: true,
        erc4337: false,
    },
    crossChainInformation: {
        circleInformation: {
            supportCirclePaymaster: true,
            cCTPInformation: {
                supportCCTP: true,
                domain: 10,
            },
            aproxFromFee: 0,
        },
        nearIntentInformation: null
    }
}
