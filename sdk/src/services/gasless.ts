import {
    createPublicClient,
    createWalletClient,
    http,
    parseSignature,
    Address
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    FacilitatorChainKey,
    calculateFee
} from "@/constants/facilitator";
import { FACILITATOR_NETWORKS } from "@/constants/facilitator";
import { usdcErc3009Abi } from "@/constants/abis";
import { SettleResponse, FacilitatorPaymentPayload } from "@/services/types";
import { BridgeStrategy, BridgeContext } from "./types";



export class GaslessStrategy implements BridgeStrategy {
    name = "Gasless";

    canHandle(context: BridgeContext): boolean {
        const { sourceChain, destChain, sourceToken, destToken } = context;
        // Same Chain -> Gasless Transfer (Only if tokens match)
        return sourceChain === destChain && (sourceToken === destToken || !destToken);
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        const { paymentPayload, sourceChain, amount, recipient } = context;
        if (!paymentPayload) {
            return { success: false, errorReason: "Payment payload is required for Gasless Strategy" };
        }

        // Ensure sourceChain matches FacilitatorChainKey (EVM mainly for gasless)
        // Ideally we check if it IS in FacilitatorChainKey, but for now assuming type safety via logic

        return processGaslessSettlement(
            paymentPayload,
            sourceChain as FacilitatorChainKey,
            amount,
            context.facilitatorPrivateKey,
            recipient as Address
        );
    }
}

// Keep original function for executing the logic
export async function processGaslessSettlement(
    paymentPayload: FacilitatorPaymentPayload,
    sourceChain: FacilitatorChainKey,
    amount: string,
    facilitatorPrivateKey: string | undefined, // Explicit undefined to allow required recipient after
    recipient: Address
): Promise<SettleResponse> {
    if (!facilitatorPrivateKey) {
        return {
            success: false,
            errorReason: "Facilitator Private Key not provided in context"
        };
    }

    const networkConfig = FACILITATOR_NETWORKS[sourceChain];
    if (!networkConfig) {
        return {
            success: false,
            errorReason: `Unsupported chain: ${sourceChain}`
        };
    }

    const { authorization, signature } = paymentPayload;

    if (!signature) {
        return {
            success: false,
            errorReason: "Missing Signature in Payment Payload"
        };
    }

    // Setup clients
    const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl)
    });
    const walletClient = createWalletClient({
        account: privateKeyToAccount(facilitatorPrivateKey as `0x${string}`),
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl)
    });

    const { v, r, s } = parseSignature(signature);

    // Step 1: TransferWithAuthorization
    let transferHash: `0x${string}`;
    try {
        transferHash = await walletClient.writeContract({
            chain: networkConfig.chain,
            address: networkConfig.usdc,
            abi: usdcErc3009Abi,
            functionName: "transferWithAuthorization",
            args: [
                authorization.from,
                authorization.to,
                BigInt(authorization.value),
                BigInt(authorization.validAfter),
                BigInt(authorization.validBefore),
                authorization.nonce,
                Number(v),
                r,
                s
            ]
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
        if (receipt.status !== "success") throw new Error("TransferWithAuthorization failed");

    } catch (e) {
        return {
            success: false,
            errorReason: e instanceof Error ? e.message : "Transfer failed"
        };
    }

    // Convert human readable string (e.g. "0.01") to atomic units (6 decimals)
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
    const fee = calculateFee();

    // Step 2: Transfer to Recipient
    try {
        const finalTransferHash = await walletClient.writeContract({
            chain: networkConfig.chain,
            address: networkConfig.usdc,
            abi: usdcErc3009Abi,
            functionName: "transfer",
            args: [recipient, amountBigInt - fee] // Deduct Fee (0.01 or 0)
        });

        await publicClient.waitForTransactionReceipt({ hash: finalTransferHash });

    } catch (e) {
        console.error("Final transfer failed", e);
        // Note: Funds are already in facilitator, so manual intervention might be needed if this fails.
        // Returning success=false but keeping transactionHash allows UI to show the initial deduction.
        return {
            success: false,
            transactionHash: transferHash,
            errorReason: "Final transfer to recipient failed. Funds are with facilitator."
        };
    }

    return {
        success: true,
        transactionHash: transferHash,
        payer: authorization.from,
        fee: fee.toString(),
        netAmount: amountBigInt.toString()
    };
}
