import { ChainKey } from "@/types/chain";
import { Address, Hex } from "viem";

export interface FacilitatorPaymentPayload {
    authorization: {
        from: Address;
        to: Address;
        value: bigint;
        validAfter: bigint;
        validBefore: bigint;
        nonce: Hex;
    };
    signature: Hex;
    signedXDR?: string;
}

export interface SettleResponse {
    success: boolean;
    errorReason?: string;
    transactionHash?: Hex | string;
    burnTransactionHash?: Hex | string;
    mintTransactionHash?: Hex | string;
    fee?: string;
    netAmount?: string;
    payer?: string;
    attestation?: {
        message: string;
        attestation: string;
    };
    data?: any;
}

export interface CrossChainConfig {
    destinationChain: string;
    destinationDomain: number;
    mintRecipient: Address;
}

export interface BridgeContext {
    paymentPayload?: FacilitatorPaymentPayload;
    sourceChain: ChainKey;
    destChain: ChainKey;
    sourceToken?: string;
    destToken?: string;
    amount: string;
    recipient: string;
    senderAddress?: string;
    facilitatorPrivateKey?: string;
    feeRecipient?: string;
    depositTxHash?: string;
}


export interface BridgeStrategy {
    name: string;
    canHandle(context: BridgeContext): boolean;
    execute(context: BridgeContext): Promise<SettleResponse>;
}
