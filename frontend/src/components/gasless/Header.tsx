import React from "react";
import { Status } from "@/hooks/useGaslessTransfer";

interface HeaderProps {
    status: Status;
    onDisconnect: () => void;
}

export function Header({ status, onDisconnect }: HeaderProps) {
    return (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-center">Gasless USDC Transfers</h1>
                <p className="text-gray-400 text-center text-sm">
                    ERC-4337 on Base Sepolia
                </p>
            </div>
            {(status === "connected" || status === "success") && (
                <button
                    onClick={onDisconnect}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 bg-red-900/20 px-3 py-1 rounded transition-colors"
                >
                    Disconnect
                </button>
            )}
        </div>
    );
}
