"use client";

import React from "react";
import { useGaslessTransfer } from "@/hooks/useGaslessTransfer";
import { Header } from "./gasless/Header";
import { LoginView } from "./gasless/LoginView";
import { AccountInfo } from "./gasless/AccountInfo";
import { DeploymentAction } from "./gasless/DeploymentAction";
import { UsdcInfo } from "./gasless/UsdcInfo";
import { ApprovalAction } from "./gasless/ApprovalAction";
import { TransferForm } from "./gasless/TransferForm";
import { StatusDisplay } from "./gasless/StatusDisplay";
import { SuccessMessage } from "./gasless/SuccessMessage";

export default function GaslessTransfer() {
  const {
    status,
    error,
    owner,
    smartAccount,
    balance,
    eoaBalance,
    allowance,
    isDeployed,
    txHash,
    connect,
    switchWallet,
    disconnect,
    deploy,
    approveInfinite,
    transfer,
    selectedChain,
    setSelectedChain,
    availableChains,
    availableTokens,
    selectedTokenSym,
    setSelectedTokenSym,
    selectedToken
  } = useGaslessTransfer();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Header status={status} onDisconnect={disconnect} />

        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">
            Target Chain
          </label>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="w-full bg-gray-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            disabled={status !== "idle" && status !== "connected" && status !== "error"}
          >
            {Object.keys(availableChains).map((chainKey) => (
              <option key={chainKey} value={chainKey}>
                {availableChains[chainKey].chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Token Selector */}
        {status !== "idle" && status !== "error" && (
          <div className="mb-6">
            <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">
              Select Token
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => setSelectedTokenSym(token.symbol)}
                  className={`p-2 rounded-lg text-sm font-semibold transition-colors ${selectedTokenSym === token.symbol
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "idle" || status === "error" ? (
          <LoginView
            onConnect={connect}
            onSwitchWallet={switchWallet}
            error={error}
          />
        ) : status === "connecting" ? (
          <div className="text-center text-gray-400">
            <div className="animate-pulse">Connecting to MetaMask...</div>
          </div>
        ) : (
          <div className="space-y-6">
            <AccountInfo
              owner={owner}
              smartAccount={smartAccount}
              isDeployed={isDeployed}
              balance={balance}
              eoaBalance={eoaBalance}
              allowance={allowance}
              tokenSymbol={selectedTokenSym}
              tokenDecimals={selectedToken.decimals}
            />

            <DeploymentAction
              isDeployed={isDeployed}
              status={status}
              onDeploy={deploy}
            />

            <UsdcInfo
              isDeployed={isDeployed}
              balance={balance}
              allowance={allowance}
              smartAccount={smartAccount}
              tokenAddress={selectedToken.address}
              tokenSymbol={selectedTokenSym}
            />

            <ApprovalAction
              isDeployed={isDeployed}
              allowance={allowance}
              status={status}
              tokenSymbol={selectedTokenSym}
              onApprove={approveInfinite}
            />

            <TransferForm
              status={status}
              isDeployed={isDeployed}
              allowance={allowance}
              eoaBalance={eoaBalance}
              balance={balance}
              tokenSymbol={selectedTokenSym}
              onSend={transfer}
            />

            <StatusDisplay status={status} />
            <SuccessMessage txHash={txHash} status={status} />
          </div>
        )}

        <p className="text-gray-500 text-xs text-center mt-6">
          Self-hosted Bundler + Paymaster (v0.4.4 Multi-Token)
        </p>
      </div>
    </div>
  );
}
