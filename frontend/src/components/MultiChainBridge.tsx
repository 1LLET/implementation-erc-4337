"use client";
import { useState } from "react";
import { formatUnits } from "viem";
import { CHAIN_CONFIGS } from "@1llet.xyz/erc4337-gasless-sdk";
import { useGaslessTransfer } from "@/hooks/useGaslessTransfer";
import { LoginView } from "./gasless/LoginView";
import { AccountInfo } from "./gasless/AccountInfo";

export default function MultiChainBridge() {
    // Bridge State
    const [sourceChain, setSourceChain] = useState<string>("84532"); // Base Sepolia ID
    const [destChain, setDestChain] = useState<string>("100"); // Gnosis ID
    const [destTokenSym, setDestTokenSym] = useState<string>("USDC"); // Default dest token
    const [amount, setAmount] = useState<string>("10");
    const [recipient, setRecipient] = useState<string>("");
    const [facilitatorKey, setFacilitatorKey] = useState<string>("");
    const [bridgeStatus, setBridgeStatus] = useState<string>("idle");
    const [logs, setLogs] = useState<string[]>([]);

    // Wallet State
    const {
        status: walletStatus,
        error: walletError,
        connect,
        switchWallet,
        disconnect,
        owner,
        smartAccount,
        balance,
        eoaBalance,
        allowance,
        selectedChain,
        setSelectedChain,
        selectedTokenSym,
        availableTokens,
        selectedToken,
        setSelectedTokenSym,
        deploy,
        isDeployed,
        approveInfinite,
        transfer
    } = useGaslessTransfer();

    const chains = Object.keys(CHAIN_CONFIGS);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    // Map Chain IDs to SDK Chain Keys
    const CHAIN_ID_TO_KEY: Record<string, string> = {
        "8453": "Base",
        "84532": "Base",
        "100": "GNOSIS",
        "10": "Optimism",
        "11155420": "Optimism",
        "42161": "Arbitrum"
    };

    const handleBridge = async () => {
        if (!facilitatorKey) {
            alert("Please enter a Facilitator Private Key");
            return;
        }
        if (walletStatus !== "connected") {
            alert("Please connect your wallet first");
            return;
        }

        const sourceKey = CHAIN_ID_TO_KEY[sourceChain];
        const destKey = CHAIN_ID_TO_KEY[destChain];

        if (!sourceKey || !destKey) {
            addLog(`Error: Unknown chain mapping for ${sourceChain} or ${destChain}`);
            return;
        }

        setBridgeStatus("bridging");
        setLogs([]);
        addLog(`Starting Bridge: ${sourceKey} -> ${destKey} (${selectedTokenSym} -> ${destTokenSym})`);

        try {
            // Dynamically import to ensure it's loaded (or just use standard import if added)
            // For now, I'll assume standard import will be added.
            const { BridgeManager } = await import("@1llet.xyz/erc4337-gasless-sdk");
            const bridgeManager = new BridgeManager();

            addLog("[Client] Initializing Bridge Manager...");

            const contextPayload = {
                sourceChain: sourceKey,
                destChain: destKey,
                amount,
                recipient,
                facilitatorPrivateKey: facilitatorKey,
                sourceToken: selectedTokenSym,
                destToken: destTokenSym,
                paymentPayload: {
                    authorization: {
                        from: smartAccount || "0x0",
                        to: "0xFacilitator" as `0x${string}`,
                        value: BigInt("10000000"),
                        validAfter: 0n,
                        validBefore: 9999999999n,
                        nonce: "0x0" as `0x${string}`
                    },
                    signature: "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`
                }
            };

            const result = await bridgeManager.execute(contextPayload);

            if (result.success) {
                // Check if this is a Near Intent that requires user deposit
                if ((result.attestation?.message && result.attestation?.message.startsWith("PENDING_USER_DEPOSIT")) ||
                    (result.transactionHash && result.transactionHash.startsWith("PENDING_USER_DEPOSIT"))) {

                    const depositData = result.data;
                    if (depositData && depositData.depositAddress && depositData.amountToDeposit) {
                        addLog(`Deposit Required! Address: ${depositData.depositAddress}`);
                        addLog(`Initiating Transfer...`);

                        try {
                            const amountHuman = formatUnits(BigInt(depositData.amountToDeposit), selectedToken?.decimals || 6);
                            const txHash = await transfer(depositData.depositAddress, amountHuman);
                            addLog(`Deposit Sent! Tx Hash: ${txHash}`);
                            addLog(`Verification Payload: Hash=${txHash}`);

                            // Recursive Call - Direct Execution
                            addLog(`Verifying Deposit with Facilitator (Client-Side)...`);

                            const verifyResult = await bridgeManager.execute({
                                ...contextPayload,
                                depositTxHash: txHash
                            });

                            if (verifyResult.success) {
                                if ((verifyResult.attestation?.message && verifyResult.attestation?.message.startsWith("PENDING_USER_DEPOSIT")) ||
                                    (verifyResult.transactionHash && verifyResult.transactionHash.startsWith("PENDING_USER_DEPOSIT"))) {

                                    addLog(`Error: Verification failed. SDK did not recognize the deposit hash.`);
                                    setBridgeStatus("error");
                                } else {
                                    addLog("Bridge Successful!");

                                    if (verifyResult.burnTransactionHash) {
                                        addLog(`Burn Hash: ${verifyResult.burnTransactionHash}`);
                                    }
                                    if (verifyResult.mintTransactionHash) {
                                        addLog(`Mint Hash: ${verifyResult.mintTransactionHash}`);
                                    }

                                    // For Near Intents or others that use 'transactionHash' as the main success indicator
                                    if (!verifyResult.burnTransactionHash && !verifyResult.mintTransactionHash && verifyResult.transactionHash && verifyResult.transactionHash !== "PENDING_USER_DEPOSIT") {
                                        // Don't log duplicate if it's the same as deposit hash we already logged, but verifyResult.transactionHash might be different?
                                        // In Near strategy, it returns the depositTxHash.
                                        // We can optionally log it or just leave "Bridge Successful!".
                                    }

                                    if (verifyResult.errorReason) {
                                        addLog(`Warning: ${verifyResult.errorReason}`);
                                    }
                                    setBridgeStatus("success");
                                }
                            } else {
                                addLog(`Bridge Error: ${verifyResult.errorReason}`);
                                setBridgeStatus("error");
                            }

                        } catch (transferError: any) {
                            addLog(`Deposit Transfer Failed: ${transferError.message}`);
                            setBridgeStatus("error");
                        }
                    } else {
                        addLog("Warning: Deposit Required but missing details.");
                        setBridgeStatus("success");
                    }
                } else {
                    addLog("Bridge Successful!");
                    addLog(`Tx Hash: ${result.transactionHash}`);
                    setBridgeStatus("success");
                }
            } else {
                addLog(`Error: ${result.errorReason}`);
                setBridgeStatus("error");
            }

        } catch (e: any) {
            addLog(`Exception: ${e.message}`);
            setBridgeStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                <div className="p-8 border-b border-gray-700 bg-gradient-to-r from-blue-900 to-purple-900">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Universal Bridge Orchestrator
                    </h1>
                    <p className="text-gray-400 mt-2">Dynamic Key & Multi-Chain Support</p>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Configuration Panel */}
                    <div className="space-y-8">

                        {/* 1. Sender Configuration (Wallet) */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4 text-green-300">1. Sender Configuration</h2>
                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                                {walletStatus === "connected" ? (
                                    <div className="space-y-4">
                                        <AccountInfo
                                            owner={owner}
                                            smartAccount={smartAccount}
                                            isDeployed={isDeployed}
                                            balance={balance}
                                            eoaBalance={eoaBalance}
                                            allowance={allowance}
                                            tokenSymbol={selectedTokenSym}
                                            tokenDecimals={selectedToken?.decimals || 6}
                                        />
                                        <button
                                            onClick={disconnect}
                                            className="w-full text-xs text-red-400 hover:text-red-300 underline"
                                        >
                                            Disconnect Wallet
                                        </button>
                                    </div>
                                ) : (
                                    <LoginView
                                        onConnect={connect}
                                        onSwitchWallet={switchWallet}
                                        error={walletError}
                                    />
                                )}
                            </div>
                        </section>

                        {/* 2. Facilitator Configuration */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4 text-blue-300">2. Facilitator Configuration</h2>
                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                                <label className="block text-sm text-gray-400 mb-2">Facilitator Private Key</label>
                                <input
                                    type="password"
                                    value={facilitatorKey}
                                    onChange={(e) => setFacilitatorKey(e.target.value.trim())}
                                    placeholder="0x..."
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <p className="text-xs text-yellow-500 mt-2">
                                    ⚠ Executes the settlement on destination.
                                </p>
                            </div>
                        </section>

                        {/* 3. Transfer Details */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4 text-purple-300">3. Transfer Details</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Source Chain</label>
                                        <select
                                            value={selectedChain}
                                            onChange={(e) => {
                                                setSelectedChain(e.target.value);
                                                // Also update local for API usage if needed, or better, remove local sourceChain
                                                setSourceChain(e.target.value);
                                            }}
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                        >
                                            {chains.map(key => {
                                                const chainId = parseInt(key);
                                                const config = CHAIN_CONFIGS[chainId];
                                                return (
                                                    <option key={key} value={key}>
                                                        {config?.chain?.name || `Chain ${key}`}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Destination Chain</label>
                                        <select
                                            value={destChain}
                                            onChange={(e) => setDestChain(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                        >
                                            {chains.map(key => {
                                                const chainId = parseInt(key);
                                                const config = CHAIN_CONFIGS[chainId];
                                                return (
                                                    <option key={key} value={key}>
                                                        {config?.chain?.name || `Chain ${key}`}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/* Token Selector */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Select Token</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableTokens.map((token) => (
                                            <button
                                                key={token.symbol}
                                                onClick={() => setSelectedTokenSym(token.symbol)}
                                                className={`p-2 rounded-lg text-xs font-semibold transition-colors border ${selectedTokenSym === token.symbol
                                                    ? "bg-purple-600 border-purple-500 text-white"
                                                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                                                    }`}
                                            >
                                                {token.symbol}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    {/* Destination Token Selector */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Select Destination Token</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(CHAIN_CONFIGS[parseInt(destChain)]?.tokens || []).map((token) => (
                                                <button
                                                    key={token.symbol}
                                                    onClick={() => setDestTokenSym(token.symbol)}
                                                    className={`p-2 rounded-lg text-xs font-semibold transition-colors border ${destTokenSym === token.symbol
                                                        ? "bg-purple-600 border-purple-500 text-white"
                                                        : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                                                        }`}
                                                >
                                                    {token.symbol}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mb-1">
                                        <label className="block text-sm text-gray-400">Amount ({selectedTokenSym})</label>
                                        <div className="text-xs text-right">
                                            {walletStatus === "connected" ? (
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500">
                                                        SA: <span className="text-white font-mono">{formatUnits(balance, selectedToken?.decimals || 18)}</span>
                                                    </span>
                                                    <span className="text-gray-500">
                                                        EOA: <span className="text-white font-mono">{formatUnits(eoaBalance, selectedToken?.decimals || 18)}</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-yellow-500 italic">Connect Wallet to see balance</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                        />
                                        {/* Quick Actions */}
                                        <div className="flex gap-1">
                                            {!isDeployed && walletStatus === "connected" && (
                                                <button
                                                    onClick={deploy}
                                                    className="bg-yellow-600 hover:bg-yellow-500 text-xs text-white px-2 py-1 rounded h-full"
                                                    title="Deploy Smart Account"
                                                >
                                                    Deploy
                                                </button>
                                            )}
                                            {walletStatus === "connected" && selectedToken?.address !== "0x0000000000000000000000000000000000000000" && allowance === 0n && (
                                                <button
                                                    onClick={approveInfinite}
                                                    className="bg-blue-600 hover:bg-blue-500 text-xs text-white px-2 py-1 rounded h-full"
                                                    title="Approve Infinite Spend"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            placeholder="0x..."
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white flex-1"
                                        />
                                        {walletStatus === "connected" && (
                                            <button
                                                onClick={() => setRecipient(smartAccount || "")}
                                                className="bg-gray-700 hover:bg-gray-600 px-3 rounded text-xs"
                                                title="Send to Self (Smart Account)"
                                            >
                                                Self
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <button
                            onClick={handleBridge}
                            disabled={bridgeStatus === "bridging" || walletStatus !== "connected"}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {bridgeStatus === "bridging" ? "Processing..." : "Execute Bridge Transfer"}
                        </button>
                    </div>

                    {/* Output Panel */}
                    <div className="bg-black rounded-lg p-4 font-mono text-sm border border-gray-700 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
                            <span className="text-green-400 font-bold">Terminal Output</span>
                            <span className="text-xs text-gray-500">{bridgeStatus.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 text-gray-300">
                            {logs.length === 0 && <span className="text-gray-600 italic">Ready...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="break-all border-l-2 border-blue-900 pl-2">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
