import { BridgeStrategy, BridgeContext } from "./types";
import { SettleResponse } from "@/services/types";
import { NETWORKS } from "@/constants/chainsInformation";

// Stargate API Base URL
const STARGATE_API_URL = "https://stargate.finance/api/v1/quotes";

export class StargateStrategy implements BridgeStrategy {
    name = "StargateFinance";

    canHandle(context: BridgeContext): boolean {
        const { sourceChain, destChain, sourceToken } = context;

        // Override: Force Stargate for Base -> Avalanche (USDC)
        if (sourceChain === "Base" && destChain === "Avalanche" && sourceToken === "USDC") {
            return true;
        }

        const sourceConfig = NETWORKS[sourceChain];
        const destConfig = NETWORKS[destChain];

        if (!sourceConfig || !destConfig) return false;

        // Check Chain Support
        const sourceStargate = sourceConfig.crossChainInformation.stargateInformation?.support;
        const destStargate = destConfig.crossChainInformation.stargateInformation?.support;

        if (!sourceStargate || !destStargate) return false;

        // Check Token Support
        // Find asset config for the token
        const sourceAsset = sourceConfig.assets.find(a => a.name === (sourceToken || "USDC"));
        const destAsset = destConfig.assets.find(a => a.name === (context.destToken || "USDC"));

        // Both assets must explicitly support Stargate
        return !!(sourceAsset?.supportsStargate && destAsset?.supportsStargate);
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        const { sourceChain, destChain, amount, recipient, destToken, sourceToken, senderAddress } = context;

        console.log(`[StargateStrategy] Executing ${sourceChain} -> ${destChain} for ${amount} ${sourceToken}`);

        // Get configurations
        const sourceConfig = NETWORKS[sourceChain];
        const destConfig = NETWORKS[destChain];

        if (!sourceConfig || !destConfig) {
            return { success: false, errorReason: "Invalid chain configuration" };
        }

        const sourceAsset = sourceConfig.assets.find(a => a.name === (sourceToken || "USDC"));
        const destAsset = destConfig.assets.find(a => a.name === (destToken || "USDC"));

        if (!sourceAsset || !destAsset) {
            return { success: false, errorReason: "Invalid asset configuration" };
        }

        const decimals = sourceAsset.decimals;
        const amountAtomic = Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();

        // 0.5% slippage default
        const minAmountAtomic = Math.floor(parseFloat(amountAtomic) * 0.995).toString();

        const srcChainKey = sourceChain.toLowerCase();
        const dstChainKey = destChain.toLowerCase();

        const url = new URL(STARGATE_API_URL);
        url.searchParams.append("srcToken", sourceAsset.address as string);
        url.searchParams.append("dstToken", destAsset.address as string);
        url.searchParams.append("srcAddress", senderAddress || recipient);
        url.searchParams.append("dstAddress", recipient);
        url.searchParams.append("srcChainKey", srcChainKey);
        url.searchParams.append("dstChainKey", dstChainKey);
        url.searchParams.append("srcAmount", amountAtomic);
        url.searchParams.append("dstAmountMin", minAmountAtomic);

        console.log(`[StargateStrategy] Fetching quote from: ${url.toString()}`);

        try {
            const response = await fetch(url.toString());
            const data = await response.json();

            if (!response.ok) {
                console.error("[StargateStrategy] API Error:", data);
                return { success: false, errorReason: `Stargate API Error: ${JSON.stringify(data)}` };
            }

            console.log("[StargateStrategy] Quote received:", JSON.stringify(data, null, 2));

            // Find a valid quote. Prefer 'taxi' (immediate), then 'bus'.
            const quotes = data.quotes || [];
            if (quotes.length === 0) {
                return { success: false, errorReason: "No routes found from Stargate API" };
            }

            const selectedQuote = quotes.find((q: any) => q.route === 'stargate/v2/taxi') || quotes[0];
            console.log(`[StargateStrategy] Selected Route: ${selectedQuote.route}`);

            // Extract 'bridge' step
            const bridgeStep = selectedQuote.steps.find((s: any) => s.type === 'bridge');
            if (!bridgeStep || !bridgeStep.transaction) {
                return { success: false, errorReason: "No bridge transaction found in quote" };
            }

            const txData = bridgeStep.transaction;
            const approvalTx = selectedQuote.steps.find((s: any) => s.type === 'approve')?.transaction;

            return {
                success: true,
                transactionHash: "PENDING_USER_SIGNATURE",
                netAmount: amount,
                data: {
                    strategy: "Stargate",
                    quote: selectedQuote,
                    // Normalized Transaction Data for execution
                    txTarget: txData.to,
                    txData: txData.data,
                    txValue: txData.value,
                    // Metadata
                    approvalRequired: approvalTx ? {
                        target: approvalTx.to,
                        data: approvalTx.data,
                        value: approvalTx.value
                    } : null
                }
            };

        } catch (e: any) {
            console.error("[StargateStrategy] Execution Error:", e);
            return { success: false, errorReason: e.message };
        }
    }
}

export async function getStargateSimulation(
    sourceChain: string,
    destChain: string,
    amount: string,
    recipient: string
) {
    if (sourceChain === "Base" && destChain === "Avalanche") {
        // Proceed
    } else {
        // Simple validation or just let API fail?
        // Since we call this explicitly, we assume caller verified.
    }

    const { TransferManager } = await import("./TransferManager");
    // We can reuse the class logic but better to just use static or duplicate
    // for separate Simulation vs Execution logic.
    // Actually, execute() returns quote data.

    // Let's implement standalone fetch.
    const sourceConfig = NETWORKS[sourceChain as any];
    const destConfig = NETWORKS[destChain as any];

    if (!sourceConfig || !destConfig) {
        return { success: false, error: "Invalid Simulation Config" };
    }

    const sourceAsset = sourceConfig.assets.find(a => a.name === "USDC");
    const destAsset = destConfig.assets.find(a => a.name === "USDC");

    if (!sourceAsset || !destAsset) {
        return { success: false, error: "USDC not found on chains" };
    }

    const decimals = sourceAsset.decimals;
    const amountAtomic = Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
    const minAmountAtomic = Math.floor(parseFloat(amountAtomic) * 0.995).toString();

    const srcChainKey = sourceChain.toLowerCase();
    const dstChainKey = destChain.toLowerCase();

    const url = new URL(STARGATE_API_URL);
    url.searchParams.append("srcToken", sourceAsset.address as string);
    url.searchParams.append("dstToken", destAsset.address as string);
    url.searchParams.append("srcAddress", recipient || "0x000000000000000000000000000000000000dEaD");
    url.searchParams.append("dstAddress", recipient || "0x000000000000000000000000000000000000dEaD");
    url.searchParams.append("srcChainKey", srcChainKey);
    url.searchParams.append("dstChainKey", dstChainKey);
    url.searchParams.append("srcAmount", amountAtomic);
    url.searchParams.append("dstAmountMin", minAmountAtomic);

    try {
        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: "Stargate API Error" };
        }

        const quotes = data.quotes || [];
        if (quotes.length === 0) return { success: false, error: "No Stargate routes found" };

        const selectedQuote = quotes.find((q: any) => q.route === 'stargate/v2/taxi') || quotes[0];

        // Stargate doesn't charge "Protocol Fee" in the same way (it's gas/slippage). 
        // We can show Fee = (SrcAmount - DstAmount)
        const srcAmt = BigInt(selectedQuote.srcAmount);
        const dstAmt = BigInt(selectedQuote.dstAmount);
        const fees = srcAmt - dstAmt;
        const feeFormatted = (Number(fees) / Math.pow(10, decimals)).toFixed(6);

        const estimatedReceived = (Number(dstAmt) / Math.pow(10, destAsset.decimals)).toFixed(6);

        return {
            success: true,
            amountSent: parseFloat(amount),
            protocolFee: feeFormatted, // Fee in USDC
            netAmountBridged: parseFloat(amount), // Technically amount sent
            estimatedReceived: estimatedReceived,
            minAmount: "0"
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
