import { NextRequest, NextResponse } from "next/server";
import { BridgeManager } from "@1llet.xyz/erc4337-gasless-sdk";

// Initialize the BridgeManager
const bridgeManager = new BridgeManager();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            paymentPayload,
            sourceChain,
            destChain,
            amount,
            recipient,
            facilitatorPrivateKey, // Key provided by caller (e.g., from client or safe storage)
            senderAddress,
            sourceToken,
            destToken
        } = body;

        if (!facilitatorPrivateKey) {
            return NextResponse.json(
                { success: false, errorReason: "Facilitator Private Key is required" },
                { status: 400 }
            );
        }

        console.log(`[API] Executing Bridge: ${sourceChain} -> ${destChain}`);

        const result = await bridgeManager.execute({
            paymentPayload,
            sourceChain,
            destChain,
            amount,
            recipient,
            facilitatorPrivateKey,
            senderAddress,
            sourceToken,
            destToken
        });

        if (result.success) {
            return NextResponse.json({ success: true, data: result });
        } else {
            return NextResponse.json(
                { success: false, errorReason: result.errorReason, data: result },
                { status: 500 } // Or 400 dependent on error
            );
        }

    } catch (error: any) {
        console.error("[API] Bridge Error:", error);
        return NextResponse.json(
            { success: false, errorReason: error.message },
            { status: 500 }
        );
    }
}
