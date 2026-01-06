import React, { useState } from "react";

interface LoginViewProps {
    onConnect: (privateKey?: string) => void;
    onSwitchWallet: () => void;
    error: string | null;
}

export function LoginView({ onConnect, onSwitchWallet, error }: LoginViewProps) {
    const [pkInput, setPkInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePkConnect = () => {
        if (!pkInput) return;
        setLoading(true);
        onConnect(pkInput);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* MetaMask / Standard Section */}
            <div className="space-y-3">
                <button
                    onClick={() => onConnect()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MM" className="w-5 h-5" />
                    Connect MetaMask
                </button>
                <button
                    onClick={onSwitchWallet}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                    Switch Wallet
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-500 uppercase font-bold text-xs">Or use manually</span>
                </div>
            </div>

            {/* Private Key Section */}
            <div className="bg-gray-700/50 p-4 rounded-xl space-y-3 border border-gray-600">
                <label className="text-xs text-gray-400 font-bold uppercase block">Private Key / Mnemonic (Stellar)</label>
                <input
                    type="password"
                    placeholder="0x... or 12 words..."
                    value={pkInput}
                    onChange={(e) => setPkInput(e.target.value)}
                    className="w-full bg-gray-800 text-white text-sm p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                />
                <button
                    onClick={handlePkConnect}
                    disabled={!pkInput}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                    Connect with Private Key
                </button>
                <p className="text-[10px] text-gray-500 text-center">
                    The key is used locally to sign transactions. It never leaves your browser.
                </p>
            </div>

            {error && <p className="text-red-400 text-sm mt-4 text-center bg-red-900/20 p-2 rounded">{error}</p>}
        </div>
    );
}
