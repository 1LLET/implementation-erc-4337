import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash, formatUnits, encodeFunctionData, maxUint256 } from "viem";
import { AccountAbstraction } from "@/lib/accountAbstraction";
import { erc20Abi } from "@/config/contracts";
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
            const userOp = await aa.buildDeployUserOperation();

            setStatus("signing");
            const signedUserOp = await aa.signUserOperation(userOp);

            setStatus("sending");
            const hash = await aa.sendUserOperation(signedUserOp);
            setUserOpHash(hash);

            setStatus("confirming");
            const receipt = await aa.waitForUserOperation(hash);
            setTxHash(receipt.receipt.transactionHash);

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
    };

    const approveInfinite = async () => {
        if (!owner || !smartAccount) return;

        try {
            setStatus("signing");
            setError(null);

            const amountUnits = maxUint256;
            const chainConfig = availableChains[selectedChain];

            const support = await aa.requestApprovalSupport(
                chainConfig.usdcAddress,
                smartAccount,
                amountUnits
            );

            console.log("Approval Support:", support);

            if (support.type === "approve") {
                if (support.fundedAmount && support.fundedAmount !== "0") {
                    console.log(`Funded ${support.fundedAmount} ETH for gas`);
                }

                const data = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [smartAccount, amountUnits]
                });

                const txHash = await window.ethereum!.request({
                    method: "eth_sendTransaction",
                    params: [{
                        from: owner,
                        to: chainConfig.usdcAddress,
                        data,
                    }]
                }) as Hash;

                setStatus("sending");
                setTxHash(txHash);

                setStatus("confirming");
                setTimeout(() => {
                    setStatus("success");
                    refreshBalance();
                }, 5000);

            } else if (support.type === "permit") {
                setError("Permit supported but not implemented in frontend demo.");
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

            let userOp;
            const hasInfinite = allowance > (maxUint256 / 2n);

            if (hasInfinite) {
                console.log("Using BATCH transferFrom (EOA -> Recipient + Fee)");

                const transferData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "transferFrom",
                    args: [owner!, recipient as Address, amountInUnits]
                });

                const feeData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "transferFrom",
                    args: [owner!, feeCollector, feeAmount]
                });

                userOp = await aa.buildUserOperationBatch([
                    { target: chainConfig.usdcAddress, value: 0n, data: transferData },
                    { target: chainConfig.usdcAddress, value: 0n, data: feeData }
                ]);

            } else {
                console.log("Using BATCH standard transfer (SA -> Recipient + Fee)");

                const transferData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [recipient as Address, amountInUnits]
                });

                const feeData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [feeCollector, feeAmount]
                });

                userOp = await aa.buildUserOperationBatch([
                    { target: chainConfig.usdcAddress, value: 0n, data: transferData },
                    { target: chainConfig.usdcAddress, value: 0n, data: feeData }
                ]);
            }

            setStatus("signing");
            const signedUserOp = await aa.signUserOperation(userOp);

            setStatus("sending");
            const hash = await aa.sendUserOperation(signedUserOp);
            setUserOpHash(hash);

            setStatus("confirming");
            const receipt = await aa.waitForUserOperation(hash);
            setTxHash(receipt.receipt.transactionHash);

            if (receipt.success) {
                setStatus("success");
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
