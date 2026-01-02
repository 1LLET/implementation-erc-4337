import React from "react";
import { type Address, formatUnits, maxUint256 } from "viem";

interface AccountInfoProps {
    owner: Address | null;
    smartAccount: Address | null;
    isDeployed: boolean;
    usdcBalance: bigint;
    eoaUsdcBalance: bigint;
    allowance: bigint;
}

export function AccountInfo({
    owner,
    smartAccount,
    isDeployed,
    usdcBalance,
    eoaUsdcBalance,
    allowance,
}: AccountInfoProps) {
    const truncateAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const formatUsdc = (amount: bigint) => formatUnits(amount, 6);

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
                <p className="text-gray-400 text-xs mb-1">USDC Balance</p>
                <p className="text-xl font-semibold">
                    {hasInfinite ? formatUsdc(eoaUsdcBalance) : formatUsdc(usdcBalance)} USDC
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {hasInfinite ? "(From your EOA)" : "(From Smart Account)"}
                </p>
            </div>
        </div>
    );
}
