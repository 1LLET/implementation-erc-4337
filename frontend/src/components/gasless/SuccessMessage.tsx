import React from "react";
import { Hash } from "viem";

interface SuccessMessageProps {
    txHash: Hash | string | null;
    status: string;
}

export function SuccessMessage({ txHash, status }: SuccessMessageProps) {
    if (status !== "success" || !txHash) return null;

    const isEvm = txHash.startsWith("0x");
    const explorerUrl = isEvm
        ? `https://sepolia.basescan.org/tx/${txHash}`
        : `https://stellar.expert/explorer/testnet/tx/${txHash}`;

    const explorerName = isEvm ? "BaseScan" : "Stellar Expert";

    return (
        <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 mt-6">
            <p className="text-green-400 font-semibold mb-2">Transfer Successful!</p>
            <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm break-all"
            >
                View on {explorerName}
            </a>
        </div>
    );
}
