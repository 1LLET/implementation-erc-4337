import { BridgeStrategy, BridgeContext } from "./types";
import { GaslessStrategy } from "./gasless";
import { CCTPStrategy } from "./cctp";
import { NearStrategy } from "./near";
import { SettleResponse } from "@/services/types";
import { StandardBridgeStrategy } from "./standard";

export class BridgeManager {
    private strategies: BridgeStrategy[];

    constructor() {
        this.strategies = [
            new StandardBridgeStrategy(),
            new GaslessStrategy(),
            new CCTPStrategy(),
            new NearStrategy()
        ];
    }

    private getStrategy(context: BridgeContext): BridgeStrategy | undefined {
        return this.strategies.find(strategy => strategy.canHandle(context));
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        // 1. Check Same Chain (Gasless/Direct)
        if (context.sourceChain === context.destChain && context.sourceToken === context.destToken) {
            console.log(`[BridgeManager] Same Chain detected. Strategy: Gasless`);
            const gaslessStrategy = new GaslessStrategy();
            return gaslessStrategy.execute(context);
        }

        const strategies = this.strategies;

        // 2. Check CCTP (Highest Priority for Cross-Chain USDC)
        const cctpStrategy = strategies.find(s => s instanceof CCTPStrategy);
        if (cctpStrategy && cctpStrategy.canHandle(context)) {
            console.log(`[BridgeManager] Routing to: ${cctpStrategy.name} (CCTP)`);
            return cctpStrategy.execute(context);
        }

        // 3. Check Near Intents
        const nearStrategy = strategies.find(s => s instanceof NearStrategy);
        if (nearStrategy && nearStrategy.canHandle(context)) {
            console.log(`[BridgeManager] Routing to: ${nearStrategy.name} (Near)`);
            return nearStrategy.execute(context);
        }

        // 4. Default/Fallback
        // (If Gasless meant "Sponsored" on same chain, it might be handled by Standard or logic above)
        // Check Gasless if strictly defined
        const gaslessStrategy = strategies.find(s => s instanceof GaslessStrategy);
        if (gaslessStrategy && gaslessStrategy.canHandle(context)) {
            console.log(`[BridgeManager] Routing to: ${gaslessStrategy.name}`);
            return gaslessStrategy.execute(context);
        }

        return {
            success: false,
            errorReason: `No suitable bridge strategy found for ${context.sourceChain} -> ${context.destChain}`
        };
    }
}
