import React from "react";

interface LoginViewProps {
    onConnect: () => void;
    onSwitchWallet: () => void;
    error: string | null;
}

export function LoginView({ onConnect, onSwitchWallet, error }: LoginViewProps) {
    return (
        <div className="space-y-3">
            <button
                onClick={onConnect}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                Connect MetaMask
            </button>
            <button
                onClick={onSwitchWallet}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
                Switch Wallet (Force Selection)
            </button>
            {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        </div>
    );
}
