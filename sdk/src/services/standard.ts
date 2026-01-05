import { BridgeStrategy, BridgeContext } from "./types";
import { SettleResponse } from "@/services/types";

export class StandardBridgeStrategy implements BridgeStrategy {
    name = "StandardBridge";

    canHandle(context: BridgeContext): boolean {
        const { paymentPayload } = context;
        // Explicitly handle "STANDARD" type (used by Refuel/Standard flow)
        return (paymentPayload as any)?.type === "STANDARD";
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        return {
            success: false,
            errorReason: "Standard Bridge Strategy is deprecated. Please use Near Intents or CCTP."
        };
    }
}
