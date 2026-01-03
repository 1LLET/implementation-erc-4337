import React from "react";
import { type Address, maxUint256 } from "viem";

interface UsdcInfoProps {
    isDeployed: boolean;
    usdcBalance: bigint;
    allowance: bigint;
    smartAccount: Address | null;
    usdcAddress?: Address;
}

export function UsdcInfo({
    isDeployed,
    usdcBalance,
    allowance,
    smartAccount,
    usdcAddress,
}: UsdcInfoProps) {
    const hasInfinite = allowance > maxUint256 / 2n;

    if (!isDeployed || usdcBalance !== 0n || hasInfinite || !usdcAddress) return null;

    const truncateAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
                <strong>Send USDC to your Smart Account:</strong>
            </p>
            <p className="font-mono text-xs mt-2 break-all text-blue-200">
                {smartAccount}
            </p>
            <p className="text-blue-400/80 text-xs mt-2">
                USDC Contract: {truncateAddress(usdcAddress)}
            </p>
            <p className="text-blue-400/80 text-xs mt-1">
                Send USDC to the Smart Account address above.
            </p>
        </div>
    );
}
