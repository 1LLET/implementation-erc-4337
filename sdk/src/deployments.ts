import { type Address } from "viem";

export const DEPLOYMENTS: Record<number, {
    entryPoint: Address;
    factory: Address;
    paymaster?: Address;
    usdc: Address;
}> = {
    // Base Mainnet
    8453: {
        entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factory: "0xe2584152891E4769025807DEa0cD611F135aDC68",
        paymaster: "0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95",
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    // Base Sepolia
    84532: {
        entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
        factory: "0x9406Cc6185a346906296840746125a0E44976454",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    }
};
