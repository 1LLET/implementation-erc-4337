import { OpenAPI, OneClickService, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { NETWORKS } from "@/constants/chainsInformation";
import { ChainKey } from "@/types/chain";
import { SettleResponse, FacilitatorPaymentPayload } from "@/services/types";
import { BridgeStrategy, BridgeContext } from "./types";

// Initialize API
OpenAPI.BASE = 'https://1click.chaindefuser.com';
// OpenAPI.TOKEN = process.env.ONE_CLICK_JWT; // Optional if not needed for public quotes

export class NearStrategy implements BridgeStrategy {
    name = "NearIntents";

    canHandle(context: BridgeContext): boolean {
        const { sourceChain, destChain } = context;
        // Basic check: Near support on both (Removed source===dest check to allow swaps)

        const sourceConfig = NETWORKS[sourceChain];
        const destConfig = NETWORKS[destChain];

        if (!sourceConfig || !destConfig) return false;

        const sourceNear = sourceConfig.crossChainInformation.nearIntentInformation?.support;
        const destNear = destConfig.crossChainInformation.nearIntentInformation?.support;

        return !!(sourceNear && destNear);
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        const { sourceChain, destChain, amount, recipient, destToken, sourceToken, senderAddress, depositTxHash } = context;

        // 1. Verify Deposit if Hash Provided
        if (depositTxHash) {
            console.log(`[NearStrategy] Verifying deposit hash: ${depositTxHash}`);

            // We need RPC to verify. Using FACILITATOR_NETWORKS for convenience as it has clean RPCs
            // dynamic import to avoid circular dep issues if any, or just import at top.
            // Assuming FACILITATOR_NETWORKS is available.
            const { createPublicClient, http } = await import("viem");
            const { FACILITATOR_NETWORKS } = await import("@/constants/facilitator");

            const networkConfig = FACILITATOR_NETWORKS[sourceChain];
            if (!networkConfig) {
                return { success: false, errorReason: `Unsupported source chain for verification: ${sourceChain}` };
            }

            const publicClient = createPublicClient({
                chain: networkConfig.chain,
                transport: http(networkConfig.rpcUrl)
            });

            try {
                console.log(`[NearStrategy] Waiting for receipt...`);
                const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTxHash as `0x${string}` });
                console.log(`[NearStrategy] Receipt found. Status: ${receipt.status}`);

                if (receipt.status === "success") {
                    return {
                        success: true,
                        transactionHash: depositTxHash,
                        netAmount: amount, // rough estimate or we can re-quote if needed
                        data: {
                            // Info for UI
                            completed: true
                        }
                    };
                } else {
                    console.error(`[NearStrategy] Transaction failed. Status: ${receipt.status}`);
                    return { success: false, errorReason: `Transaction Reverted on-chain (Status: ${receipt.status})` };
                }
            } catch (e: any) {
                console.error(`[NearStrategy] Verification Error:`, e);
                return { success: false, errorReason: `Verification Error: ${e.message}` };
            }
        }

        // 2. No Hash -> Get Quote & Prompt Deposit
        try {
            const quoteResult = await getNearQuote(
                sourceChain,
                destChain,
                amount,
                destToken,
                sourceToken,
                recipient,
                senderAddress // refund address
            );

            // Return success with the deposit address. 
            // The Orchestrator or UI will handle sending the funds to this address.
            return {
                success: true,
                transactionHash: "PENDING_USER_DEPOSIT", // Placeholder or null
                netAmount: quoteResult.amountAtomicNet, // Or formatted
                // We might need to extend SettleResponse to include explicit instruction
                // For now, we reuse the existing type. 
                // In a real scenario, we'd add `depositAddress` to the response type.
                // Assuming SettleResponse is flexible or we console log it for the user context.
                // To be safe and useful:
                data: {
                    depositAddress: quoteResult.depositAddress,
                    amountToDeposit: quoteResult.amountAtomicNet,
                    sourceToken: sourceToken || "USDC",
                    memo: (quoteResult.quote.quote as any).depositMemo || (quoteResult.quote.quote as any).memo
                }
            } as any; // Casting as any to avoid strict type issues if SettleResponse doesn't have `data` yet

        } catch (e: any) {
            return { success: false, errorReason: e.message };
        }
    }
}

export async function getNearQuote(
    sourceChain: ChainKey,
    destChain: ChainKey,
    amount: string,
    destToken?: string,
    sourceToken?: string,
    recipient?: string,
    senderAddress?: string
) {
    const sourceConfig = NETWORKS[sourceChain];
    const destConfig = NETWORKS[destChain];

    if (!sourceConfig || !destConfig) {
        throw new Error("Invalid chain configuration");
    }

    const sourceAssetInfo = sourceConfig.crossChainInformation.nearIntentInformation?.assetsId.find(
        (a) => a.name === (sourceToken || "USDC")
    ) || sourceConfig.crossChainInformation.nearIntentInformation?.assetsId[0];

    const destAssetInfo = destConfig.crossChainInformation.nearIntentInformation?.assetsId.find(
        (a) => a.name === (destToken || "USDC")
    ) || destConfig.crossChainInformation.nearIntentInformation?.assetsId[0];

    const sourceAsset = sourceAssetInfo?.assetId;
    const destAsset = destAssetInfo?.assetId;

    if (!sourceAsset || !destAsset) {
        throw new Error("Near Intents not supported for these assets");
    }

    const decimals = sourceAssetInfo?.decimals || (sourceChain === "Stellar" ? 7 : 6);
    const amountAtomicTotal = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
    const isDev = process.env.NEXT_PUBLIC_ENVIROMENT === "development" || process.env.NODE_ENV === "development";
    // Fee is hardcoded here, should be dynamic or 0.02 as per previous logic
    const feeValue = isDev ? 0 : 0.02;

    const feeUnits = Math.floor(feeValue * Math.pow(10, decimals));
    const amountAtomicNet = (amountAtomicTotal - feeUnits).toString();

    if (BigInt(amountAtomicNet) <= 0) {
        throw new Error("Amount too small to cover fees");
    }

    // Recipient on destination
    if (!recipient) {
        throw new Error("Recipient address is required for NEAR Quote");
    }

    // Refund address on source (sender)
    const refundAddress = senderAddress || recipient;

    console.log(`[NearService] Requesting Quote: ${sourceChain} -> ${destChain}`, { amount, sourceAsset, destAsset });

    const quoteRequest: QuoteRequest = {
        dry: false,
        swapType: QuoteRequest.swapType.EXACT_INPUT,
        slippageTolerance: 100,
        originAsset: sourceAsset as string,
        depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
        depositMode: sourceChain === "Stellar" ? QuoteRequest.depositMode.MEMO : undefined,
        destinationAsset: destAsset as string,
        amount: amountAtomicNet,
        refundTo: refundAddress,
        refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
        recipient: recipient,
        recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
        deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        referral: "1llet",
        quoteWaitingTimeMs: 10000,
    };

    const quote = await OneClickService.getQuote(quoteRequest);

    if (!quote.quote?.depositAddress) {
        throw new Error("No deposit address returned from 1-Click Quote");
    }

    return {
        quote,
        depositAddress: quote.quote.depositAddress,
        amountAtomicTotal: BigInt(amountAtomicTotal),
        amountAtomicNet
    };
}
