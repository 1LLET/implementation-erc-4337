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
    usdcBalance,
    eoaUsdcBalance,
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
  } = useGaslessTransfer();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Header status={status} onDisconnect={disconnect} />

        <div className="mb-6">
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
              usdcBalance={usdcBalance}
              eoaUsdcBalance={eoaUsdcBalance}
              allowance={allowance}
            />

            <DeploymentAction
              isDeployed={isDeployed}
              status={status}
              onDeploy={deploy}
            />

            <UsdcInfo
              isDeployed={isDeployed}
              usdcBalance={usdcBalance}
              allowance={allowance}
              smartAccount={smartAccount}
            />

            <ApprovalAction
              isDeployed={isDeployed}
              allowance={allowance}
              status={status}
              onApprove={approveInfinite}
            />

            <TransferForm
              status={status}
              isDeployed={isDeployed}
              allowance={allowance}
              eoaUsdcBalance={eoaUsdcBalance}
              usdcBalance={usdcBalance}
              onSend={transfer}
            />

            <StatusDisplay status={status} />
            <SuccessMessage txHash={txHash} status={status} />
          </div>
        )}

        <p className="text-gray-500 text-xs text-center mt-6">
          Self-hosted Bundler + Paymaster
        </p>
      </div>
    </div>
  );
}
