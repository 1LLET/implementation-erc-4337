import React, { useState, useEffect } from "react";
import { maxUint256 } from "viem";
import { Status } from "@/hooks/useGaslessTransfer";

interface TransferFormProps {
    status: Status;
    isDeployed: boolean;
    allowance: bigint;
    eoaBalance: bigint;
    balance: bigint;
    tokenSymbol: string;
    onSend: (recipient: string, amount: string) => void;
}

export function TransferForm({
    status,
    isDeployed,
    allowance,
    eoaBalance,
    balance,
    tokenSymbol,
    onSend,
}: TransferFormProps) {
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");

    useEffect(() => {
        if (status === "success") {
            setRecipient("");
            setAmount("");
        }
    }, [status]);

    const hasInfinite = allowance > maxUint256 / 2n;
    const canInteract = status === "connected" || status === "success";

    const hasBalance = hasInfinite ? eoaBalance > 0n : balance > 0n;

    const handleSubmit = () => {
        onSend(recipient, amount);
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-gray-400 text-sm mb-2">
                    Recipient Address
                </label>
                <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    disabled={!canInteract}
                />
            </div>

            <div>
                <label className="block text-gray-400 text-sm mb-2">Amount ({tokenSymbol})</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    disabled={!canInteract}
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!canInteract || !isDeployed || !hasBalance}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                Send {tokenSymbol} (Gasless)
            </button>
        </div>
    );
}
