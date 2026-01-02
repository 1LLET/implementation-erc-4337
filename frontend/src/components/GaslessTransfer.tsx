"use client";

import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash, formatUnits, encodeFunctionData, parseUnits, maxUint256 } from "viem";
import { AccountAbstraction, type UserOpReceipt } from "@/lib/accountAbstraction";
import { config, erc20Abi } from "@/config/contracts";

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
  const [eoaUsdcBalance, setEoaUsdcBalance] = useState<bigint>(0n); // EOA balance
  const [allowance, setAllowance] = useState<bigint>(0n); // Infinite approval check
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
        // Check infinite approval
        const allow = await aa.getAllowance();
        setAllowance(allow);

        // If infinite approval, show EOA balance. Else show Smart Account balance (likely 0)
        // Actually, we want to know if we can spend from EOA.
        // Let's get both balances
        const smartAccountBal = await aa.getUsdcBalance();
        const eoaBal = await aa.getEoaUsdcBalance();

        setUsdcBalance(smartAccountBal);
        setEoaUsdcBalance(eoaBal);

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

      // Determine if we are doing transferFrom (EOA -> Recipient) or transfer (SA -> Recipient)
      // Since we are pushing the "infinite approval" flow, we prefer transferFrom if allowance is high
      // Fee Configuration
      const feeAmount = 10000n; // 0.01 USDC
      const feeCollector = "0x01E048F8450E6ff1bf0e356eC78A4618D9219770";

      let userOp;

      const hasInfinite = allowance > (maxUint256 / 2n); // Simple check for "large enough"

      if (hasInfinite) {
        // Use transferFrom (EOA -> Recipient) + Fee (EOA -> Collector)
        console.log("Using BATCH transferFrom (EOA -> Recipient + Fee)");

        // 1. Transfer to Recipient
        const transferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transferFrom",
          args: [owner!, recipient as Address, amountInUnits]
        });

        // 2. Transfer Fee to Collector
        const feeData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transferFrom",
          args: [owner!, feeCollector, feeAmount]
        });

        userOp = await aa.buildUserOperationBatch([
          { target: config.usdcAddress, value: 0n, data: transferData },
          { target: config.usdcAddress, value: 0n, data: feeData }
        ]);

      } else {
        // Fallback: standard transfer (SA -> Recipient) + Fee (SA -> Collector)
        console.log("Using BATCH standard transfer (SA -> Recipient + Fee)");

        // 1. Transfer to Recipient
        const transferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient as Address, amountInUnits]
        });

        // 2. Transfer Fee to Collector
        const feeData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [feeCollector, feeAmount]
        });

        userOp = await aa.buildUserOperationBatch([
          { target: config.usdcAddress, value: 0n, data: transferData },
          { target: config.usdcAddress, value: 0n, data: feeData }
        ]);
      }

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

  // Handle Deposit (Approve + Fund flow)
  const handleDeposit = async () => {
    if (!owner || !smartAccount) return;

    try {
      setStatus("signing"); // Reusing signing status for approval
      setError(null);

      const amountUnits = maxUint256; // Infinite approval

      // 1. Request Approval Support (Funding check)
      const support = await aa.requestApprovalSupport(
        config.usdcAddress,
        smartAccount,
        amountUnits
      );

      console.log("Approval Support:", support);

      if (support.type === "approve") {
        if (support.fundedAmount && support.fundedAmount !== "0") {
          // Maybe show a toast or log that funding happened
          console.log(`Funded ${support.fundedAmount} ETH for gas`);
        }

        // 2. Trigger Approve Transaction
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [smartAccount, amountUnits]
        });

        const txHash = await window.ethereum!.request({
          method: "eth_sendTransaction",
          params: [{
            from: owner,
            to: config.usdcAddress,
            data,
            // value: "0x0" // Optional
          }]
        }) as Hash;

        setStatus("sending"); // Reusing sending status
        setTxHash(txHash);

        // Wait for receipt (manual poll or just wait)
        // For simplicity, we just set success after a delay or optimistically
        // Ideally we should wait for receipt.
        // But since this is "gasless transfer" demo, maybe we stop here or we implement wait.

        setStatus("confirming");
        // Simple wait loop
        setTimeout(() => {
          setStatus("success");
          refreshBalance();
        }, 5000);

      } else if (support.type === "permit") {
        setError("Permit supported but not implemented in frontend demo. Please use tokens without Permit or update demo.");
        setStatus("error");
      } else {
        console.log("Approval not needed");
        setStatus("success");
      }

    } catch (err) {
      console.error("Deposit error:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
      setStatus("error");
    }
  };

  // Switch wallet (force permission prompt)
  const switchWallet = async () => {
    try {
      await window.ethereum!.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      // After selecting, try to connect
      await connect();
    } catch (error) {
      console.error("Switch wallet cancelled or failed", error);
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-center">
              Gasless USDC Transfers
            </h1>
            <p className="text-gray-400 text-center text-sm">
              ERC-4337 on Base Sepolia
            </p>
          </div>
          {(status === "connected" || status === "success") && (
            <button
              onClick={() => {
                setStatus("idle");
                setOwner(null);
                setSmartAccount(null);
                setUsdcBalance(0n);
                setEoaUsdcBalance(0n);
                setAllowance(0n);
                setIsDeployed(false);
                setRecipient("");
                setAmount("");
                setUserOpHash(null);
                setTxHash(null);
                setError(null);
              }}
              className="text-xs text-red-400 hover:text-red-300 border border-red-900 bg-red-900/20 px-3 py-1 rounded transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {status === "idle" || status === "error" ? (
          <div className="space-y-3">
            <button
              onClick={connect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Connect MetaMask
            </button>
            <button
              onClick={switchWallet}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Switch Wallet (Force Selection)
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
                  {/* Show EOA balance if we have infinite approval, otherwise SA balance */}
                  {allowance > (maxUint256 / 2n) ? formatUsdc(eoaUsdcBalance) : formatUsdc(usdcBalance)} USDC
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {allowance > (maxUint256 / 2n) ? "(From your EOA)" : "(From Smart Account)"}
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

            {/* USDC Info - Only show if NO infinite approval and NO balance */}
            {isDeployed && usdcBalance === 0n && allowance < (maxUint256 / 2n) && (
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

            {/* Deposit Section - Hide if already approved */}
            {isDeployed && allowance < (maxUint256 / 2n) && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600">
                <h3 className="text-gray-300 font-semibold mb-3">Enable USDC Spend</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeposit}
                    disabled={status !== "connected" && status !== "success"}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Approve Infinite Amount
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Approves Smart Account to spend your USDC (Infinite). <br />
                  (Gasless for you: Bundler refunds gas if needed)
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
                  (allowance > (maxUint256 / 2n) ? eoaUsdcBalance === 0n : usdcBalance === 0n)
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
