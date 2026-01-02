import React from "react";
import { Status } from "@/hooks/useGaslessTransfer";

interface StatusDisplayProps {
    status: Status;
}

export function StatusDisplay({ status }: StatusDisplayProps) {
    const getStatusText = () => {
        switch (status) {
            case "connecting":
                return "Connecting to MetaMask...";
            case "building":
                return "Building UserOperation...";
            case "signing":
                return "Sign the message in MetaMask...";
            case "sending":
                return "Sending to bundler...";
            case "confirming":
                return "Waiting for confirmation...";
            default:
                return null;
        }
    };

    const text = getStatusText();
    if (!text) return null;

    return (
        <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 mt-6">
            <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <p className="text-blue-400 text-sm">{text}</p>
            </div>
        </div>
    );
}
