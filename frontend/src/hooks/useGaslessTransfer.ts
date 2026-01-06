import { useState, useEffect, useCallback } from "react";
import { type Address, type Hash } from "viem";
import { AccountAbstraction } from "@/lib/accountAbstraction";
import { availableChains, defaultChainKey } from "@/config/chains";
import StellarHDWallet from "stellar-hd-wallet";

export type Status = "idle" | "connecting" | "connected" | "building" | "signing" | "sending" | "confirming" | "success" | "error";

export function useGaslessTransfer() {
    const [selectedChain, setSelectedChain] = useState<string>(defaultChainKey);
    const [aa, setAa] = useState(() => new AccountAbstraction(availableChains[defaultChainKey] as any));
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);

    // Stellar Service State
    const [stellarService, setStellarService] = useState<any>(null);

    // Token State
    const [selectedTokenSym, setSelectedTokenSym] = useState<string>("USDC");

    // Account state
    const [owner, setOwner] = useState<Address | string | null>(null);
    const [smartAccount, setSmartAccount] = useState<Address | null>(null);
    const [balance, setBalance] = useState<bigint>(0n);
    const [eoaBalance, setEoaBalance] = useState<bigint>(0n);
    const [allowance, setAllowance] = useState<bigint>(0n);
    const [isDeployed, setIsDeployed] = useState(false);
    const [connectedPrivateKey, setConnectedPrivateKey] = useState<string | null>(null);

    // Transaction state
    const [userOpHash, setUserOpHash] = useState<Hash | null>(null);
    const [txHash, setTxHash] = useState<Hash | string | null>(null);

    // Derived state
    const chainConfig = availableChains[selectedChain];
    const availableTokens = chainConfig.tokens;
    const selectedToken = availableTokens.find(t => t.symbol === selectedTokenSym) || availableTokens[0];

    // Re-initialize AA when chain changes
    useEffect(() => {
        const config = availableChains[selectedChain];
        // Only re-instantiate for EVM chains. 
        // We check for 'evm' property or lack of 'nonEvm' property depending on how we distinguished them.
        // Based on our type definition, NonEvmChainConfig has 'chain' as `{ id: number ... }` and NO 'contracts' usually, 
        // but easier to just check properties. Or just cast if we know our ID map.
        // Stellar ID is "9000".
        if (selectedChain !== "9000") {
            const newAA = new AccountAbstraction(config as any);
            setAa(newAA);
        }

        // Reset state
        setOwner(null);
        setSmartAccount(null);
        setBalance(0n);
        setEoaBalance(0n);
        setAllowance(0n);
        setIsDeployed(false);
        setStatus("idle");
        setError(null);
        setStellarService(null);

        // Default to first token if previous selection invalid
        const hasToken = availableChains[selectedChain].tokens.some(t => t.symbol === selectedTokenSym);
        if (!hasToken) {
            setSelectedTokenSym(availableChains[selectedChain].tokens[0].symbol);
        }
    }, [selectedChain]);

    // Refresh balance
    const refreshBalance = useCallback(async () => {
        if (!owner) return;
        try {
            if (stellarService) {
                // Stellar Balance Logic
                const balStr = await stellarService.getBalance(owner as string, selectedTokenSym);
                const decimals = selectedToken.decimals;
                const balBigInt = BigInt(Math.floor(parseFloat(balStr) * (10 ** decimals)));
                setBalance(balBigInt);
                setEoaBalance(balBigInt);
                setSmartAccount(null);
                setIsDeployed(true);
                return;
            }

            // EVM Logic
            const state = await aa.getAccountState(selectedToken.address as Address);

            setBalance(state.balance);
            setEoaBalance(state.eoaBalance);
            setAllowance(state.allowance);
            setIsDeployed(state.isDeployed);
            setSmartAccount(state.smartAccount);
            setOwner(state.owner);
        } catch (err) {
            console.error("Error refreshing balance:", err);
        }
    }, [aa, owner, selectedToken, stellarService, selectedTokenSym]);

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

            // Check for Mnemonic (12 words)
            if (pk && pk.trim().split(" ").length >= 12) {
                // Determine if it's Stellar (mnemonic)
                const wallet = StellarHDWallet.fromMnemonic(pk.trim());
                const keypair = wallet.getKeypair(0);
                const secret = keypair.secret();

                // Proceed as Stellar
                const { StellarService } = await import("@1llet.xyz/erc4337-gasless-sdk");
                const service = new StellarService();

                // Use derived secret
                const derivedKeypair = service.getKeypair(secret);
                const publicKey = derivedKeypair.publicKey();

                setStellarService(service);
                setOwner(publicKey);
                setSmartAccount(null);

                if (selectedChain !== "Stellar" && selectedChain !== "9000") {
                    setSelectedChain("9000");
                }

                setConnectedPrivateKey(secret); // Store derived secret
                setStatus("connected");

            } else if (pk && pk.startsWith('S')) {
                // Stellar Key Detected
                const { StellarService } = await import("@1llet.xyz/erc4337-gasless-sdk");
                const service = new StellarService();

                const keypair = service.getKeypair(pk);
                const publicKey = keypair.publicKey();

                setStellarService(service);
                setOwner(publicKey);
                setSmartAccount(null);
                setConnectedPrivateKey(pk); // Store raw secret

                if (selectedChain !== "Stellar" && selectedChain !== "9000") {
                    setSelectedChain("9000");
                }

                setStatus("connected");
            } else {
                // EVM Logic
                const res = await aa.connect(pk as `0x${string}` | undefined);
                setOwner(res.owner);
                setSmartAccount(res.smartAccount);
                if (pk) setConnectedPrivateKey(pk); // Store for EVM too if helpful
                setStatus("connected");
            }

            // Note: refreshBalance is triggered by effect on 'status'/'owner'
        } catch (err) {
            console.error("Connect error:", err);
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
        setStellarService(null);
    };

    const deploy = async () => {
        if (status === "building" || status === "signing" || status === "sending" || status === "confirming") return;

        if (stellarService) {
            console.log("Deploy not needed for Stellar");
            return;
        }

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
        if (!owner) return;
        if (stellarService) return;
        if (!smartAccount) return;

        try {
            setStatus("signing");
            setError(null);

            const result = await aa.approveToken(selectedToken.address as Address, smartAccount as Address);

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

        // Validate recipient
        if (!stellarService && !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
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

            if (stellarService) {
                const pk = connectedPrivateKey || process.env.NEXT_PUBLIC_PRIVATE_KEY!;

                // Direct Stellar Transfer
                setStatus("signing");
                const xdr = await stellarService.buildTransferXdr(
                    pk,
                    recipient,
                    amount,
                    selectedTokenSym
                );

                setStatus("sending");
                const response = await stellarService.submitXdr(xdr);
                setTxHash(response.hash);
                setStatus("success");
                refreshBalance();
                return response.hash;
            }

            // EVM Logic
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
                selectedToken.address as Address,
                recipient as Address,
                amountInUnits,
                feeConfig
            );

            // Handle result
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
