import React from "react";
import { type Address, formatUnits, maxUint256 } from "viem";

interface AccountInfoProps {
    owner: Address | string | null;
    smartAccount: Address | string | null;
    isDeployed: boolean;
    balance: bigint;
    eoaBalance: bigint;
    allowance: bigint;
    tokenSymbol: string;
    tokenDecimals: number;
    tokenValueFormatted?: string | null;
}

export function AccountInfo({
    owner,
    smartAccount,
    isDeployed,
    balance,
    eoaBalance,
    allowance,
    tokenSymbol,
    tokenDecimals,
    tokenValueFormatted,
}: AccountInfoProps) {
    const truncateAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const formatToken = (amount: bigint) => {
        const val = formatUnits(amount, tokenDecimals);
        // Limit to 6 decimals max
        const pointIndex = val.indexOf('.');
        if (pointIndex !== -1 && val.length > pointIndex + 7) {
            return val.slice(0, pointIndex + 7);
        }
        return val;
    };

    const hasInfinite = allowance > maxUint256 / 2n;

    return (
        <div className="space-y-3">
            <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Your EOA</p>
                <p className="font-mono text-sm">{owner && truncateAddress(owner)}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">
                    Smart Account{" "}
                    {isDeployed ? (
                        <span className="text-green-400">(Deployed)</span>
                    ) : (
                        <span className="text-yellow-400">(Not deployed yet)</span>
                    )}
                </p>
                <p className="font-mono text-sm break-all">{smartAccount}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">{tokenSymbol} Balance</p>
                <p className="text-xl font-semibold">
                    {hasInfinite ? formatToken(eoaBalance) : formatToken(balance)} {tokenSymbol}
                </p>
                <div className="flex flex-col">
                    <p className="text-xs text-gray-500 mt-1">
                        {hasInfinite ? "(From your EOA)" : "(From Smart Account)"}
                    </p>
                    {tokenValueFormatted && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {tokenValueFormatted}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
