import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash, formatUnits, encodeFunctionData, maxUint256 } from "viem";
import { AccountAbstraction } from "@/lib/accountAbstraction";
import { erc20Abi, type Token, type ChainConfig } from "@1llet.xyz/erc4337-gasless-sdk";
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

    // Token State
    const [selectedTokenSym, setSelectedTokenSym] = useState<string>("USDC");

    // Account state
    const [owner, setOwner] = useState<Address | null>(null);
    const [smartAccount, setSmartAccount] = useState<Address | null>(null);
    const [balance, setBalance] = useState<bigint>(0n);
    const [eoaBalance, setEoaBalance] = useState<bigint>(0n);
    const [allowance, setAllowance] = useState<bigint>(0n);
    const [isDeployed, setIsDeployed] = useState(false);

    // Transaction state
    const [userOpHash, setUserOpHash] = useState<Hash | null>(null);
    const [txHash, setTxHash] = useState<Hash | null>(null);

    // Derived state
    const chainConfig = availableChains[selectedChain];
    const availableTokens = chainConfig.tokens;
    const selectedToken = availableTokens.find(t => t.symbol === selectedTokenSym) || availableTokens[0];

    // Re-initialize AA when chain changes
    useEffect(() => {
        const newAA = new AccountAbstraction(availableChains[selectedChain]);
        setAa(newAA);

        // Reset state
        setOwner(null);
        setSmartAccount(null);
        setBalance(0n);
        setEoaBalance(0n);
        setAllowance(0n);
        setIsDeployed(false);
        setStatus("idle");
        setError(null);

        // Default to first token if previous selection invalid
        const hasToken = availableChains[selectedChain].tokens.some(t => t.symbol === selectedTokenSym);
        if (!hasToken) {
            setSelectedTokenSym(availableChains[selectedChain].tokens[0].symbol);
        }
    }, [selectedChain]);

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (smartAccount) {
            try {
                // Use generic SDK methods
                const tokenAddr = selectedToken.address;

                const [allow, bal, eoaBal, deployed] = await Promise.all([
                    aa.getAllowance(tokenAddr).catch(() => 0n), // Catch error for Native tokens (allowance 0)
                    aa.getBalance(tokenAddr),
                    aa.getEoaBalance(tokenAddr),
                    aa.isAccountDeployed()
                ])

                setAllowance(allow);
                setBalance(bal);
                setEoaBalance(eoaBal);
                setIsDeployed(deployed);
            } catch (err) {
                console.error("Error refreshing balance:", err);
            }
        }
    }, [aa, smartAccount, selectedToken]);

    // Auto-refresh balance
    useEffect(() => {
        if (status === "connected" || status === "success") {
            refreshBalance();
            const interval = setInterval(refreshBalance, 10000);
            return () => clearInterval(interval);
        }
    }, [status, refreshBalance]);

    // Watch for token change to refresh immediately
    useEffect(() => {
        if (status === "connected") {
            refreshBalance();
        }
    }, [selectedTokenSym]);

    const connect = async (manualPrivateKey?: string) => {
        setStatus("connecting");
        setError(null);
        try {
            // Priority: 1. Manual Argument, 2. Env Variable, 3. Undefined (MetaMask)
            const pk = manualPrivateKey || process.env.NEXT_PUBLIC_PRIVATE_KEY;

            // @ts-ignore - SDK 0.4.6 supports privateKey argument
            const { owner, smartAccount } = await aa.connect(pk as `0x${string}` | undefined);

            setOwner(owner);
            setSmartAccount(smartAccount);

            // Fetch initial state
            await refreshBalance();

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
        setBalance(0n);
        setEoaBalance(0n);
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
            const tokenAddress = selectedToken.address;

            setStatus("signing");
            setError(null);

            const result = await aa.approveToken(tokenAddress, smartAccount);

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
            console.error("Approval error:", err);
            setError(err instanceof Error ? err.message : "Approval failed");
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
            const decimals = selectedToken.decimals;
            const amountInUnits = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals)));

            // Fee Configuration (Always USDC for simplicity? Or native? Assuming USDC for now as per original code)
            // Ideally commission should be in native or same token.
            // Original code hardcoded USDC fee.
            // CAUTION: If sending ETH, we can't pay fee in "transfer". We'd need to send native value.
            // For now, I will keep the fee logic ONLY if token is USDC or I'll comment it out/skip it for non-USDC to avoid complexity?
            // "implementa commission fee (0.01 USDC Batching)" was a previous requirement.
            // If I transfer EURe, paying USDC fee implies I have USDC.
            // Let's assume fee is only charged if transferring USDC for now to keep it safe, or generic 0.01 units? No that's dangerous.
            // I'll skip fee for non-USDC tokens for this iteration to ensure safety, or check if token is USDC.

            const isUSDC = selectedToken.symbol === "USDC";
            const feeAmount = 10000n; // 0.01 USDC
            const feeCollector = "0x01E048F8450E6ff1bf0e356eC78A4618D9219770";

            // Determine Source: Smart Account vs EOA
            const isProd = process.env.NODE_ENV !== "development";
            const needsFee = isProd && isUSDC;

            const totalNeeded = amountInUnits + (needsFee ? feeAmount : 0n);
            const hasInfinite = allowance > (maxUint256 / 2n);

            let useEoa = false;

            if (balance >= totalNeeded) {
                console.log("Using Smart Account Balance (Standard Transfer)");
                useEoa = false;
            } else if (hasInfinite && eoaBalance >= totalNeeded) {
                console.log("Using EOA Balance (TransferFrom)");
                useEoa = true;
            }
            // For Native Token (No allowance needed for EOA, but we can't "pull" ETH from EOA in a UserOp batch easily without value)
            else if (selectedToken.address === "0x0000000000000000000000000000000000000000" && eoaBalance >= totalNeeded) {
                // Native ETH EOA Fallback? "AccountAbstraction.transfer" handles this by sending simple transaction.
                // But here we might want to batch? ETH cannot be batched from EOA in UserOp context easily (it's outside SA).
                // We will rely on AA.transfer fallback which handles "Zero Address" = direct eth tx.
                // So if using EOA for ETH, we just do aa.transfer (which does sendTransaction internally).
                useEoa = true;
            } else {
                throw new Error(`Insufficient funds. Needed: ${formatUnits(totalNeeded, decimals)} ${selectedToken.symbol}. Available: SA=${formatUnits(balance, decimals)}, EOA=${formatUnits(eoaBalance, decimals)}`);
            }

            const tokenAddress = selectedToken.address;

            // If it's a simple transfer (no fee batching needed OR generic token), we can use SDK aa.transfer?
            // But we need to support EOA fallback "pull" (transferFrom). aa.transfer does "push" (transfer).
            // So we must stick to manual construction for ERC20 EOA pull.

            const transactions = [];

            if (useEoa) {
                if (tokenAddress === "0x0000000000000000000000000000000000000000") {
                    // Native ETH from EOA
                    // Cannot batch this in UserOp for EOA source. Must be direct tx.
                    // aa.transfer handles this.
                    setStatus("signing");
                    const receipt = await aa.transfer(tokenAddress, recipient as Address, amountInUnits);
                    setTxHash(receipt.receipt.transactionHash);
                    setStatus("success");
                    refreshBalance();
                    return;
                }

                // EOA -> Recipient (ERC20 transferFrom)
                transactions.push({
                    target: tokenAddress,
                    value: 0n,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "transferFrom",
                        args: [owner!, recipient as Address, amountInUnits]
                    })
                });

                // EOA -> Fee Collector (Only if USDC and Prod)
                if (needsFee) {
                    transactions.push({
                        target: tokenAddress,
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
                    target: tokenAddress,
                    value: 0n,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [recipient as Address, amountInUnits]
                    })
                });

                // Smart Account -> Fee Collector (Only if USDC and Prod)
                if (needsFee) {
                    transactions.push({
                        target: tokenAddress,
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
        balance,
        eoaBalance,
        allowance,
        isDeployed,
        userOpHash,
        txHash,
        selectedChain,
        availableChains,
        setSelectedChain,

        // Token stuff
        availableTokens,
        selectedToken,
        selectedTokenSym,
        setSelectedTokenSym,

        connect,
        switchWallet,
        disconnect,
        deploy,
        approveInfinite,
        transfer
    };
}
