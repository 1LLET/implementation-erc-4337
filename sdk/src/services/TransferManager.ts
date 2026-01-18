import { BridgeStrategy, BridgeContext } from "./types";
import { CCTPStrategy } from "./cctp";
import { NearStrategy } from "./near";
import { StargateStrategy } from "./stargate";
import { SettleResponse } from "@/services/types";

export class TransferManager {
    private strategies: BridgeStrategy[];

    constructor() {
        this.strategies = [
            new CCTPStrategy(),
            new StargateStrategy(),
            new NearStrategy()
        ];
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        // 1. Check Same Chain (Direct Transfer)
        if (context.sourceChain === context.destChain && context.sourceToken === context.destToken) {
            console.log(`[TransferManager] Same Chain detected. Signal Direct Transfer.`);
            // Return a signal that tells the client to execute a direct transfer
            return {
                success: true,
                transactionHash: "DIRECT_TRANSFER_REQUIRED",
                data: {
                    action: "DIRECT_TRANSFER",
                    amount: context.amount,
                    token: context.sourceToken,
                    recipient: context.recipient
                }
            };
        }

        const strategies = this.strategies;

        // 2. Check Stargate (Priority for testing Base -> Avalanche override)
        const stargateStrategy = strategies.find(s => s instanceof StargateStrategy);
        if (stargateStrategy && stargateStrategy.canHandle(context)) {
            console.log(`[TransferManager] Routing to: ${stargateStrategy.name} (Stargate)`);
            return stargateStrategy.execute(context);
        }

        // 3. Check CCTP (Highest Priority for Cross-Chain USDC)
        const cctpStrategy = strategies.find(s => s instanceof CCTPStrategy);
        if (cctpStrategy && cctpStrategy.canHandle(context)) {
            console.log(`[TransferManager] Routing to: ${cctpStrategy.name} (CCTP)`);
            return cctpStrategy.execute(context);
        }

        // 4. Check Near Intents
        const nearStrategy = strategies.find(s => s instanceof NearStrategy);
        if (nearStrategy && nearStrategy.canHandle(context)) {
            console.log(`[TransferManager] Routing to: ${nearStrategy.name} (Near)`);
            return nearStrategy.execute(context);
        }

        return {
            success: false,
            errorReason: `No suitable transfer strategy found for ${context.sourceChain} -> ${context.destChain}`
        };
    }
}
