import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash, formatUnits, encodeFunctionData, maxUint256 } from "viem";
import { AccountAbstraction } from "@/lib/accountAbstraction";
import { erc20Abi } from "@1llet.xyz/erc4337-gasless-sdk";
import { availableChains, defaultChainKey } from "@/config/chains";

export type Status =
    | "idle"
    | "connecting"
    | "connected"
    | "building"
    | "signing"
    | "sending"
    | "confirming"
    | "success"
    | "error";



export function useGaslessTransfer() {
    const [selectedChain, setSelectedChain] = useState<string>(defaultChainKey);
    const [aa, setAa] = useState(() => new AccountAbstraction(availableChains[defaultChainKey]));
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);

    // Account state
    const [owner, setOwner] = useState<Address | null>(null);
    const [smartAccount, setSmartAccount] = useState<Address | null>(null);
    const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
    const [eoaUsdcBalance, setEoaUsdcBalance] = useState<bigint>(0n);
    const [allowance, setAllowance] = useState<bigint>(0n);
    const [isDeployed, setIsDeployed] = useState(false);

    // Transaction state
    const [userOpHash, setUserOpHash] = useState<Hash | null>(null);
    const [txHash, setTxHash] = useState<Hash | null>(null);

    // Re-initialize AA when chain changes
    useEffect(() => {
        const newAA = new AccountAbstraction(availableChains[selectedChain]);
        setAa(newAA);

        // Reset state
        setOwner(null);
        setSmartAccount(null);
        setUsdcBalance(0n);
        setEoaUsdcBalance(0n);
        setAllowance(0n);
        setIsDeployed(false);
        setStatus("idle");
        setError(null);
    }, [selectedChain]);

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (smartAccount) {
            try {
                const allow = await aa.getAllowance();
                const smartAccountBal = await aa.getUsdcBalance();
                const eoaBal = await aa.getEoaUsdcBalance();
                const deployed = await aa.isAccountDeployed();

                setAllowance(allow);
                setUsdcBalance(smartAccountBal);
                setEoaUsdcBalance(eoaBal);
                setIsDeployed(deployed);
            } catch (err) {
                console.error("Error refreshing balance:", err);
            }
        }
    }, [aa, smartAccount]);

    // Auto-refresh balance
    useEffect(() => {
        if (status === "connected" || status === "success") {
            refreshBalance();
            const interval = setInterval(refreshBalance, 10000);
            return () => clearInterval(interval);
        }
    }, [status, refreshBalance]);

    const connect = async () => {
        setStatus("connecting");
        setError(null);
        try {
            const { owner, smartAccount } = await aa.connect();
            setOwner(owner);
            setSmartAccount(smartAccount);

            // Initial fetch will happen via the useEffect or we can force it here
            const deployed = await aa.isAccountDeployed();

            const bal = await aa.getUsdcBalance();
            const eoaBal = await aa.getEoaUsdcBalance();

            setUsdcBalance(bal);
            setEoaUsdcBalance(eoaBal);
            setIsDeployed(deployed);

            // Update allowance too
            const allow = await aa.getAllowance();
            setAllowance(allow);

            setStatus("connected");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect");
            setStatus("error");
        }
    };

    const switchWallet = async () => {
        try {
            await window.ethereum!.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            });
            await connect();
        } catch (error) {
            console.error("Switch wallet cancelled or failed", error);
        }
    };

    const disconnect = () => {
        setStatus("idle");
        setOwner(null);
        setSmartAccount(null);
        setUsdcBalance(0n);
        setEoaUsdcBalance(0n);
        setAllowance(0n);
        setIsDeployed(false);
        setUserOpHash(null);
        setTxHash(null);
        setError(null);
    };

    const deploy = async () => {
        if (status === "building" || status === "signing" || status === "sending" || status === "confirming") return;
        setError(null);
        setUserOpHash(null);
        setTxHash(null);

        try {
            setStatus("building");
            // Use SDK high-level method
            const receipt = await aa.deployAccount();

            setTxHash(receipt.receipt.transactionHash);
            setStatus("success");
            setIsDeployed(true);
            refreshBalance();

        } catch (err) {
            console.error("Deployment error:", err);
            setError(err instanceof Error ? err.message : "Deployment failed");
            setStatus("error");
        }
    };

    const approveInfinite = async () => {
        if (!owner || !smartAccount) return;

        try {
            const chainConfig = availableChains[selectedChain];
            if (!chainConfig.usdcAddress) throw new Error("USDC address not configured for this chain");

            setStatus("signing");
            setError(null);

            // Use SDK high-level method
            const result = await aa.approveToken(chainConfig.usdcAddress, smartAccount);

            if (result === "NOT_NEEDED") {
                console.log("Approval not needed");
                setStatus("success");
            } else {
                setTxHash(result);
                setStatus("sending");

                setStatus("confirming");
                setTimeout(() => {
                    setStatus("success");
                    refreshBalance();
                }, 5000);
            }

        } catch (err) {
            console.error("Deposit error:", err);
            setError(err instanceof Error ? err.message : "Deposit failed");
            setStatus("error");
        }
    };

    const transfer = async (recipient: string, amount: string) => {
        if (!recipient || !amount) {
            setError("Please enter recipient and amount");
            return;
        }

        if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
            setError("Invalid recipient address");
            return;
        }

        setError(null);
        setUserOpHash(null);
        setTxHash(null);

        try {
            setStatus("building");
            const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1e6));

            // Fee Configuration
            const feeAmount = 10000n; // 0.01 USDC
            const feeCollector = "0x01E048F8450E6ff1bf0e356eC78A4618D9219770";

            const chainConfig = availableChains[selectedChain];
            if (!chainConfig.usdcAddress) throw new Error("USDC address not configured for this chain");

            // Determine Source: Smart Account vs EOA
            // Priority:
            // 1. Smart Account (if it has enough balance)
            // 2. EOA (if it has enough balance AND allowance)

            const isProd = process.env.NODE_ENV !== "development";
            const totalNeeded = amountInUnits + (isProd ? feeAmount : 0n);
            const hasInfinite = allowance > (maxUint256 / 2n);

            let useEoa = false;
            let userOp;

            if (usdcBalance >= totalNeeded) {
                console.log("Using Smart Account Balance (Standard Transfer)");
                useEoa = false;
            } else if (hasInfinite && eoaUsdcBalance >= totalNeeded) {
                console.log("Using EOA Balance (TransferFrom)");
                useEoa = true;
            } else {
                throw new Error(`Insufficient funds. Needed: ${formatUnits(totalNeeded, 6)} USDC. Available: SA=${formatUnits(usdcBalance, 6)}, EOA=${formatUnits(eoaUsdcBalance, 6)}`);
            }

            const transactions = [];

            if (useEoa) {
                // EOA -> Recipient
                transactions.push({
                    target: chainConfig.usdcAddress,
                    value: 0n,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "transferFrom",
                        args: [owner!, recipient as Address, amountInUnits]
                    })
                });

                // EOA -> Fee Collector
                if (isProd) {
                    transactions.push({
                        target: chainConfig.usdcAddress,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: erc20Abi,
                            functionName: "transferFrom",
                            args: [owner!, feeCollector, feeAmount]
                        })
                    });
                }
            } else {
                // Smart Account -> Recipient
                transactions.push({
                    target: chainConfig.usdcAddress,
                    value: 0n,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [recipient as Address, amountInUnits]
                    })
                });

                // Smart Account -> Fee Collector
                if (isProd) {
                    transactions.push({
                        target: chainConfig.usdcAddress,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: erc20Abi,
                            functionName: "transfer",
                            args: [feeCollector, feeAmount]
                        })
                    });
                }
            }

            setStatus("signing");
            // Use SDK v0.2.0 high-level batch method
            // This handles build -> sign -> send -> wait AND error decoding
            const receipt = await aa.sendBatchTransaction(transactions);

            setTxHash(receipt.receipt.transactionHash);
            setStatus("success");
            refreshBalance();

        } catch (err) {
            console.error("Transfer error:", err);
            setError(err instanceof Error ? err.message : "Transfer failed");
            setStatus("error");
        }
    };

    return {
        status,
        error,
        owner,
        smartAccount,
        usdcBalance,
        eoaUsdcBalance,
        allowance,
        isDeployed,
        userOpHash,
        txHash,
        selectedChain,
        availableChains,
        setSelectedChain,
        connect,
        switchWallet,
        disconnect,
        deploy,
        approveInfinite,
        transfer
    };
}
