"use client";

import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash, formatUnits } from "viem";
import { AccountAbstraction, type UserOpReceipt } from "@/lib/accountAbstraction";
import { config } from "@/config/contracts";

type Status =
  | "idle"
  | "connecting"
  | "connected"
  | "building"
  | "signing"
  | "sending"
  | "confirming"
  | "success"
  | "error";

export default function GaslessTransfer() {
  const [aa] = useState(() => new AccountAbstraction());
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Account state
  const [owner, setOwner] = useState<Address | null>(null);
  const [smartAccount, setSmartAccount] = useState<Address | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [isDeployed, setIsDeployed] = useState(false);

  // Form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Transaction state
  const [userOpHash, setUserOpHash] = useState<Hash | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (smartAccount) {
      try {
        const bal = await aa.getUsdcBalance();
        setUsdcBalance(bal);
        const deployed = await aa.isAccountDeployed();
        setIsDeployed(deployed);
      } catch (err) {
        console.error("Error refreshing balance:", err);
      }
    }
  }, [aa, smartAccount]);

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (status === "connected" || status === "success") {
      refreshBalance();
      const interval = setInterval(refreshBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [status, refreshBalance]);

  // Connect wallet
  const connect = async () => {
    setStatus("connecting");
    setError(null);

    try {
      const { owner, smartAccount } = await aa.connect();
      setOwner(owner);
      setSmartAccount(smartAccount);

      const bal = await aa.getUsdcBalance();
      setUsdcBalance(bal);

      const deployed = await aa.isAccountDeployed();
      setIsDeployed(deployed);

      setStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setStatus("error");
    }
  };

  // Send gasless USDC transfer
  const sendTransfer = async () => {
    if (!recipient || !amount) {
      setError("Please enter recipient and amount");
      return;
    }

    // Validate address
    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid recipient address");
      return;
    }

    setError(null);
    setUserOpHash(null);
    setTxHash(null);

    try {
      // Build UserOperation for USDC transfer
      // USDC has 6 decimals
      setStatus("building");
      const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1e6));
      const userOp = await aa.buildUserOperationUsdc(
        recipient as Address,
        amountInUnits
      );

      // Sign with MetaMask
      setStatus("signing");
      const signedUserOp = await aa.signUserOperation(userOp);

      // Send to bundler
      setStatus("sending");
      const hash = await aa.sendUserOperation(signedUserOp);
      setUserOpHash(hash);

      // Wait for confirmation
      setStatus("confirming");
      const receipt = await aa.waitForUserOperation(hash);
      setTxHash(receipt.receipt.transactionHash);

      if (receipt.success) {
        setStatus("success");
        setRecipient("");
        setAmount("");
        refreshBalance();
      } else {
        throw new Error("UserOperation failed on-chain");
      }
    } catch (err) {
      console.error("Transfer error:", err);
      setError(err instanceof Error ? err.message : "Transfer failed");
      setStatus("error");
    }
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatUsdc = (amount: bigint) => {
    return formatUnits(amount, 6);
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">
          Gasless USDC Transfers
        </h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          ERC-4337 on Base Sepolia
        </p>

        {status === "idle" || status === "error" ? (
          <div>
            <button
              onClick={connect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Connect MetaMask
            </button>
            {status === "error" && error && (
              <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
            )}
          </div>
        ) : status === "connecting" ? (
          <div className="text-center text-gray-400">
            <div className="animate-pulse">Connecting to MetaMask...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="space-y-3">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Your EOA</p>
                <p className="font-mono text-sm">
                  {owner && truncateAddress(owner)}
                </p>
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
                  {formatUsdc(usdcBalance)} USDC
                </p>
              </div>

            </div>

            {/* Deploy Account Action */}
            {!isDeployed && (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 font-semibold mb-2">
                  Account Deployment Required
                </p>
                <p className="text-yellow-200 text-sm mb-3">
                  You must deploy your smart account before you can send transactions.
                </p>
                <button
                  onClick={async () => {
                    if (status === "building" || status === "signing" || status === "sending" || status === "confirming") return;
                    setError(null);
                    setUserOpHash(null);
                    setTxHash(null);

                    try {
                      setStatus("building");
                      const userOp = await aa.buildDeployUserOperation();

                      setStatus("signing");
                      const signedUserOp = await aa.signUserOperation(userOp);

                      setStatus("sending");
                      const hash = await aa.sendUserOperation(signedUserOp);
                      setUserOpHash(hash);

                      setStatus("confirming");
                      const receipt = await aa.waitForUserOperation(hash);
                      setTxHash(receipt.receipt.transactionHash); // This line needs to be compatible with UserOpReceipt type

                      if (receipt.success) {
                        setStatus("success");
                        setIsDeployed(true);
                        refreshBalance();
                      } else {
                        throw new Error("Deployment failed on-chain");
                      }
                    } catch (err) {
                      console.error("Deployment error:", err);
                      setError(err instanceof Error ? err.message : "Deployment failed");
                      setStatus("error");
                    }
                  }}
                  disabled={status !== "connected" && status !== "success"} // Only active when connected and not busy
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Deploy Smart Account
                </button>
              </div>
            )}

            {/* USDC Info */}
            {isDeployed && usdcBalance === 0n && (
              <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  <strong>Send USDC to your Smart Account:</strong>
                </p>
                <p className="font-mono text-xs mt-2 break-all text-blue-200">
                  {smartAccount}
                </p>
                <p className="text-blue-400/80 text-xs mt-2">
                  USDC Contract: {truncateAddress(config.usdcAddress)}
                </p>
                <p className="text-blue-400/80 text-xs mt-1">
                  Send USDC to the Smart Account address above.
                </p>
              </div>
            )}

            {/* Transfer Form */}
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
                  disabled={status !== "connected" && status !== "success"}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  disabled={status !== "connected" && status !== "success"}
                />
              </div>

              <button
                onClick={sendTransfer}
                disabled={
                  (status !== "connected" && status !== "success") ||
                  !isDeployed ||
                  usdcBalance === 0n
                }
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Send USDC (Gasless)
              </button>
            </div>

            {/* Status */}
            {getStatusText() && (
              <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <p className="text-blue-400 text-sm">{getStatusText()}</p>
                </div>
              </div>
            )}

            {/* Success */}
            {status === "success" && txHash && (
              <div className="bg-green-900/50 border border-green-600 rounded-lg p-4">
                <p className="text-green-400 font-semibold mb-2">
                  Transfer Successful!
                </p>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm break-all"
                >
                  View on BaseScan
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-gray-500 text-xs text-center mt-6">
          Self-hosted Bundler + Paymaster
        </p>
      </div>
    </div>
  );
}
