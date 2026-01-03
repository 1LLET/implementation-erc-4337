import { type Address, type Chain, type Hash, type Hex } from "viem";

export interface ChainConfig {
    chain: Chain;
    rpcUrl?: string; // Optional, defaults to chain.rpcUrls.default
    bundlerUrl: string;
    entryPointAddress?: Address;
    factoryAddress?: Address;
    paymasterAddress?: Address;
    usdcAddress?: Address;
}

export interface UserOperation {
    sender: Address;
    nonce: bigint;
    initCode: Hex;
    callData: Hex;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: Hex;
    signature: Hex;
}

export interface GasEstimate {
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
}

export interface UserOpReceipt {
    userOpHash: Hash;
    sender: Address;
    success: boolean;
    actualGasCost: string;
    receipt: {
        transactionHash: Hash;
        blockNumber: string;
    };
}

export interface ApprovalSupportResult {
    type: "permit" | "approve" | "none";
    gasCost?: string;
    fundingNeeded?: string;
    fundedAmount?: string;
}
