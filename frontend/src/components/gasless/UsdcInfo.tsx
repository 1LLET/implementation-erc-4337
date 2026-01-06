import React from "react";
import { type Address, maxUint256 } from "viem";

interface UsdcInfoProps {
    isDeployed: boolean;
    balance: bigint;
    allowance: bigint;
    smartAccount: Address | null;
    tokenAddress?: string;
    tokenSymbol: string;
}

export function UsdcInfo({
    isDeployed,
    balance,
    allowance,
    smartAccount,
    tokenAddress,
    tokenSymbol,
}: UsdcInfoProps) {
    const hasInfinite = allowance > maxUint256 / 2n;

    // Don't show if balance > 0 OR if we have infinite approval (using EOA)
    if (!isDeployed || balance !== 0n || hasInfinite || !tokenAddress) return null;

    const truncateAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
                <strong>Send {tokenSymbol} to your Smart Account:</strong>
            </p>
            <p className="font-mono text-xs mt-2 break-all text-blue-200">
                {smartAccount}
            </p>
            <p className="text-blue-400/80 text-xs mt-2">
                {tokenSymbol} Contract: {truncateAddress(tokenAddress)}
            </p>
            <p className="text-blue-400/80 text-xs mt-1">
                Send {tokenSymbol} to the Smart Account address above.
            </p>
        </div>
    );
}
