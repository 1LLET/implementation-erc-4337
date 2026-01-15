
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
        entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factoryAddress: "0xB2E45aCbB68f3e98C87B6df16625f22e11728556",
        paymasterAddress: "0x7A92b3Fee017E3E181a51D9045AACE30eC2B387D",
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
