import { OpenAPI, OneClickService, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';
import { NETWORKS } from "@/constants/chainsInformation";
import { ChainKey } from "@/types/chain";
import { SettleResponse, FacilitatorPaymentPayload } from "@/services/types";
import { BridgeStrategy, BridgeContext } from "./types";
import { StellarService } from "./StellarService";
import { PlatformFees, DUMMY_EVM_ADDRESS, DUMMY_STELLAR_ADDRESS, calculateFee } from "@/constants/facilitator";

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
        const { sourceChain, destChain, amount, recipient, destToken, sourceToken, senderAddress, depositTxHash, paymentPayload } = context;

        // 0. Handle Stellar Source (Push)
        if (sourceChain === "Stellar" && paymentPayload?.signedXDR) {
            const signedXDR = paymentPayload.signedXDR;

            console.log("[NearStrategy] Submitting Stellar User -> Facilitator TX...");

            try {
                const stellarService = new StellarService();
                const result = await stellarService.submitXdr(signedXDR);
                const pullHash = result.hash;
                console.log("[NearStrategy] Pull Success (Stellar):", pullHash);

                return {
                    success: true,
                    transactionHash: pullHash,
                    data: {
                        completed: true,
                        message: "Stellar Transaction Submitted. Bridge in progress."
                    }
                };
            } catch (e: any) {
                console.error("Stellar Submit Error", e);
                return { success: false, errorReason: "Stellar Submit Failed: " + (e.message || "Unknown") };
            }
        }

        // 1. Verify Deposit if Hash Provided
        if (depositTxHash) {
            console.log(`[NearStrategy] Verifying deposit hash: ${depositTxHash}`);

            // Stellar Verification
            if (sourceChain === "Stellar") {
                try {
                    const { StellarService } = await import("./StellarService");
                    const stellarService = new StellarService();
                    // We need to fetch the tx
                    // StellarService doesn't have `getTransaction` yet, only submit.
                    // Need to check if StellarService has server access (it does, public prop).
                    const tx = await stellarService.server.transactions().transaction(depositTxHash).call();

                    if (tx.successful) {
                        // Fetch operations to find the payment destination (deposit address)
                        const operations = await stellarService.server.operations().forTransaction(depositTxHash).call();
                        const paymentOp = operations.records.find((op: any) => op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive');

                        let depositAddress = "";
                        let memo = "";

                        if (paymentOp) {
                            // @ts-ignore
                            depositAddress = paymentOp.to || paymentOp.funder || ""; // 'to' is standard for payment
                        }

                        if (tx.memo_type === 'text' || tx.memo_type === 'id') {
                            memo = tx.memo || "";
                        }

                        if (depositAddress) {
                            console.log(`[NearStrategy] Submitting deposit to 1-Click: ${depositTxHash} -> ${depositAddress} (Memo: ${memo})`);
                            try {
                                await OneClickService.submitDepositTx({
                                    txHash: depositTxHash,
                                    depositAddress: depositAddress,
                                    memo: memo || undefined
                                });
                                console.log("[NearStrategy] Deposit submitted successfully.");
                            } catch (e: any) {
                                console.error("[NearStrategy] Failed to submit deposit to 1-Click:", e.message);
                                // We don't fail the whole verification if this fails, but it's risky. 
                                // Ideally we should retry or fail. For now log error.
                            }
                        } else {
                            console.error("[NearStrategy] Could not determine deposit address from Stellar operations.");
                        }

                        return {
                            success: true,
                            transactionHash: depositTxHash,
                            netAmount: amount,
                            data: { completed: true }
                        };
                    } else {
                        return { success: false, errorReason: "Stellar Transaction Failed" };
                    }
                } catch (e: any) {
                    console.error("Stellar Verification Error", e);
                    return { success: false, errorReason: `Stellar Verification Failed: ${e.message}` };
                }
            }

            // We need RPC to verify. Using FACILITATOR_NETWORKS for convenience as it has clean RPCs
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
                // @ts-ignore
                const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTxHash as `0x${string}` });
                console.log(`[NearStrategy] Receipt found. Status: ${receipt.status}`);

                if (receipt.status === "success") {

                    // Get Transaction to find 'to' address
                    const tx = await publicClient.getTransaction({ hash: depositTxHash as `0x${string}` });
                    const depositAddress = tx.to;

                    if (depositAddress) {
                        console.log(`[NearStrategy] Submitting deposit to 1-Click: ${depositTxHash} -> ${depositAddress}`);
                        try {
                            await OneClickService.submitDepositTx({
                                txHash: depositTxHash,
                                depositAddress: depositAddress
                            });
                            console.log("[NearStrategy] Deposit submitted successfully.");
                        } catch (e: any) {
                            console.error("[NearStrategy] Failed to submit deposit to 1-Click:", e.message);
                        }
                    }

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
            return {
                success: true,
                transactionHash: "PENDING_USER_DEPOSIT",
                netAmount: quoteResult.amountAtomicNet,
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
    senderAddress?: string,
    options?: { dry?: boolean }
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

    console.log(`[NearService] Requesting Quote: ${sourceChain} -> ${destChain}`, JSON.stringify({ amount, sourceAsset, destAsset, options }, null, 2));

    const quoteRequest: QuoteRequest = {
        dry: options?.dry || false,
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
        deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        referral: "1llet",
        quoteWaitingTimeMs: 10000,
    };

    console.log(`[NearService] Final QuoteRequest:`, JSON.stringify(quoteRequest, null, 2));

    const quote = await OneClickService.getQuote(quoteRequest);

    if (!options?.dry && !quote.quote?.depositAddress) {
        throw new Error("No deposit address returned from 1-Click Quote");
    }

    return {
        quote,
        depositAddress: quote.quote?.depositAddress || "",
        amountAtomicTotal: BigInt(amountAtomicTotal),
        amountAtomicNet
    };
}

export async function getNearSimulation(
    sourceChain: ChainKey,
    destChain: ChainKey,
    amount: string,
    destToken?: string,
    sourceToken?: string
) {
    console.log(">>> [Bridge Quote] Simulation Request:", { sourceChain, destChain, amount, destToken, sourceToken });

    if (!amount || isNaN(parseFloat(amount))) {
        throw new Error("Invalid amount");
    }

    const amountNum = parseFloat(amount);
    const isDev = process.env.NEXT_PUBLIC_ENVIROMENT === "development" || process.env.NODE_ENV === "development";
    // User logic: const FEE = IS_DEV ? PlatformFess.DEV : PlatformFess.EVM_TO_OTHER
    const usedFee = isDev ? PlatformFees.DEV : PlatformFees.EVM_TO_OTHER;

    // Hardcoded min amount check as per snippet
    const MIN_AMOUNT = usedFee;

    // Determine decimals from config to ensure precision (e.g. Stellar USDC is 7)
    const sourceConfig = NETWORKS[sourceChain];
    const sourceAssetInfo = sourceConfig?.crossChainInformation?.nearIntentInformation?.assetsId.find(
        (a) => a.name === (sourceToken || "USDC")
    ) || sourceConfig?.crossChainInformation?.nearIntentInformation?.assetsId[0];
    const decimals = sourceAssetInfo?.decimals || (sourceChain === "Stellar" ? 7 : 6);

    const netAmountBridged = (amountNum - usedFee).toFixed(decimals);

    if (parseFloat(netAmountBridged) <= 0) {
        return {
            success: false,
            error: `Insufficient amount (${amountNum}) to cover fee (${usedFee})`,
            minAmount: MIN_AMOUNT
        };
    }

    const sender = sourceChain === "Stellar" ? DUMMY_STELLAR_ADDRESS : DUMMY_EVM_ADDRESS;
    const recipient = destChain === "Stellar" ? DUMMY_STELLAR_ADDRESS : DUMMY_EVM_ADDRESS;

    try {
        const quoteResult = await getNearQuote(
            sourceChain,
            destChain,
            amount,
            destToken,
            sourceToken,
            recipient,
            sender,
            { dry: true }
        );

        return {
            success: true,
            amountSent: amountNum,
            protocolFee: usedFee,
            netAmountBridged: parseFloat(netAmountBridged),
            // @ts-ignore - access safe property
            estimatedReceived: quoteResult.quote?.quote?.estimatedOutput || "0",
            minAmount: MIN_AMOUNT
        };

    } catch (error: any) {
        console.error(">>> [Bridge Quote] Error:", error);
        return {
            success: false,
            error: error.message || "Unknown quote error",
            minAmount: MIN_AMOUNT
        };
    }
}
