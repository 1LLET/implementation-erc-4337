import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash } from "viem";
import { AccountAbstraction } from "@/lib/accountAbstraction";
import { availableChains, defaultChainKey } from "@/config/chains";

export type Status = "idle" | "connecting" | "connected" | "building" | "signing" | "sending" | "confirming" | "success" | "error";

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

    // Refresh balance using SDK's getAccountState
    const refreshBalance = useCallback(async () => {
        if (!owner) return;
        try {
            const state = await aa.getAccountState(selectedToken.address);

            setBalance(state.balance);
            setEoaBalance(state.eoaBalance);
            setAllowance(state.allowance);
            setIsDeployed(state.isDeployed);
            setSmartAccount(state.smartAccount);
            setOwner(state.owner);
        } catch (err) {
            console.error("Error refreshing balance:", err);
        }
    }, [aa, owner, selectedToken]);

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
            const pk = manualPrivateKey || process.env.NEXT_PUBLIC_PRIVATE_KEY;
            const res = await aa.connect(pk as `0x${string}` | undefined);

            setOwner(res.owner);
            setSmartAccount(res.smartAccount);
            setStatus("connected");

            // Initial refresh
            await refreshBalance();
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
            setStatus("signing");
            setError(null);

            const result = await aa.approveToken(selectedToken.address, smartAccount);

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

            // Fee Configuration
            const isUSDC = selectedToken.symbol === "USDC";
            const isProd = process.env.NODE_ENV !== "development";
            const needsFee = isProd && isUSDC;

            const feeConfig = needsFee ? {
                amount: 10000n, // 0.01 USDC
                recipient: "0x01E048F8450E6ff1bf0e356eC78A4618D9219770" as Address
            } : undefined;

            setStatus("signing");

            // Call Auto-Smart Transfer from SDK
            const receipt = await aa.smartTransfer(
                selectedToken.address,
                recipient as Address,
                amountInUnits,
                feeConfig
            );

            // Handle result (UserOpReceipt or wrapper)
            const txHash = 'receipt' in receipt && receipt.receipt
                ? receipt.receipt.transactionHash
                : (receipt as any).transactionHash; // Fallback

            setTxHash(txHash);
            setStatus("success");
            refreshBalance();
            return txHash;

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
