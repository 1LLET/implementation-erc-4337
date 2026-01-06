import {
    type Address,
    createPublicClient,
    createWalletClient,
    decodeErrorResult,
    type Hash,
    type Hex,
    http,
    type LocalAccount,
    type PublicClient,
    type WalletClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { factoryAbi, } from "./constants";
import { type ApprovalSupportResult, type ChainConfig, type EvmChainConfig, type UserOperation, type UserOpReceipt } from "./types";
import { BundlerClient } from "./BundlerClient";
import { TokenService } from "./TokenService";
import { UserOpBuilder } from "./UserOpBuilder";

/**
 * ERC-4337 Account Abstraction Client
 */
export class AccountAbstraction {
    private owner: Address | null = null;
    private smartAccountAddress: Address | null = null;
    private chainConfig: EvmChainConfig;
    private publicClient: PublicClient;
    private bundlerClient: BundlerClient;
    private walletClient: WalletClient | null = null;

    // Services
    private tokenService: TokenService;
    private userOpBuilder: UserOpBuilder;

    // Resolved addresses
    private entryPointAddress: Address;
    private factoryAddress: Address;

    constructor(chainConfig: EvmChainConfig) {
        this.chainConfig = chainConfig;

        // Validation
        if (!chainConfig.entryPointAddress) throw new Error("EntryPoint address required");
        this.entryPointAddress = chainConfig.entryPointAddress;
        if (!chainConfig.factoryAddress) throw new Error("Factory address required");
        this.factoryAddress = chainConfig.factoryAddress;

        // Setup Clients
        const rpcUrl = chainConfig.rpcUrl || chainConfig.chain.rpcUrls.default.http[0];
        this.publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(rpcUrl),
        });

        this.bundlerClient = new BundlerClient(chainConfig, this.entryPointAddress);

        // Setup Services
        this.tokenService = new TokenService(chainConfig, this.publicClient);
        this.userOpBuilder = new UserOpBuilder(chainConfig, this.bundlerClient, this.publicClient);
    }

    /**
     * Connect to MetaMask OR use Private Key
     * @param privateKey (Optional) Hex string of private key. If provided, uses local signing.
     */
    async connect(privateKey?: Hex): Promise<{ owner: Address; smartAccount: Address }> {
        // Mode 1: Private Key (Local Signer)
        if (privateKey) {
            const account: LocalAccount = privateKeyToAccount(privateKey);
            this.owner = account.address;

            const rpcUrl = this.chainConfig.rpcUrl || this.chainConfig.chain.rpcUrls.default.http[0];
            this.walletClient = createWalletClient({
                account,
                chain: this.chainConfig.chain,
                transport: http(rpcUrl)
            });

        } else {
            // Mode 2: External Provider (MetaMask)
            if (typeof window === "undefined" || !window.ethereum) {
                throw new Error("MetaMask is not installed and no private key provided");
            }

            // Request account access
            const accounts = (await window.ethereum.request({
                method: "eth_requestAccounts",
            })) as string[];

            if (!accounts || accounts.length === 0) throw new Error("No accounts found");

            // Check network
            const chainId = (await window.ethereum.request({
                method: "eth_chainId",
            })) as string;
            const targetChainId = this.chainConfig.chain.id;

            if (parseInt(chainId, 16) !== targetChainId) {
                try {
                    await window.ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: "0x" + targetChainId.toString(16) }],
                    });
                } catch (switchError: unknown) {
                    const error = switchError as { code?: number };
                    if (error.code === 4902) {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [
                                {
                                    chainId: "0x" + targetChainId.toString(16),
                                    chainName: this.chainConfig.chain.name,
                                    nativeCurrency: this.chainConfig.chain.nativeCurrency,
                                    rpcUrls: [this.chainConfig.rpcUrl || this.chainConfig.chain.rpcUrls.default.http[0]],
                                    blockExplorerUrls: this.chainConfig.chain.blockExplorers?.default?.url
                                        ? [this.chainConfig.chain.blockExplorers.default.url]
                                        : [],
                                },
                            ],
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            this.owner = accounts[0] as Address;
            // No walletClient needed, we use window.ethereum directly
        }

        this.smartAccountAddress = await this.getSmartAccountAddress(this.owner!);

        return {
            owner: this.owner!,
            smartAccount: this.smartAccountAddress,
        };
    }

    // --- Account Management ---

    async isAccountDeployed(): Promise<boolean> {
        if (!this.smartAccountAddress) return false;
        const code = await this.publicClient.getBytecode({ address: this.smartAccountAddress });
        return code !== undefined;
    }

    async deployAccount(): Promise<UserOpReceipt> {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");
        return this.sendTransaction({
            target: this.smartAccountAddress,
            value: 0n,
            data: "0x"
        });
    }

    /**
     * Get the Smart Account address for an owner
     */
    async getSmartAccountAddress(owner: Address): Promise<Address> {
        const address = await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: factoryAbi,
            functionName: "getAccountAddress",
            args: [owner, 0n],
        }) as Address;
        return address;
    }

    // --- Token Methods (Delegated) ---

    getTokenAddress(token: string | Address): Address {
        return this.tokenService.getTokenAddress(token);
    }

    async getBalance(token: string | Address): Promise<bigint> {
        if (!this.smartAccountAddress) throw new Error("Not connected");
        return this.tokenService.getBalance(token, this.smartAccountAddress);
    }

    async getEoaBalance(token: string | Address): Promise<bigint> {
        if (!this.owner) throw new Error("Not connected");
        return this.tokenService.getBalance(token, this.owner);
    }



    async getAllowance(token: string | Address = "USDC"): Promise<bigint> {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");
        return this.tokenService.getAllowance(token, this.owner, this.smartAccountAddress);
    }

    /**
     * Get comprehensive state of the account for a specific token
     * Useful for UI initialization
     */
    async getAccountState(token: string | Address) {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");

        const tokenAddress = this.getTokenAddress(token);
        const isNative = tokenAddress === "0x0000000000000000000000000000000000000000";

        const [balance, eoaBalance, allowance, isDeployed] = await Promise.all([
            this.getBalance(token),
            this.getEoaBalance(token),
            isNative ? 0n : this.getAllowance(token).catch(() => 0n), // Handle native/error gracefully
            this.isAccountDeployed()
        ]);

        return {
            owner: this.owner,
            smartAccount: this.smartAccountAddress,
            balance,
            eoaBalance,
            allowance,
            isDeployed
        };
    }

    // --- Transactions ---

    async sendTransaction(
        tx: { target: Address; value?: bigint; data?: Hex }
    ): Promise<UserOpReceipt> {
        return this.sendBatchTransaction([tx]);
    }

    async sendBatchTransaction(
        txs: { target: Address; value?: bigint; data?: Hex }[]
    ): Promise<UserOpReceipt> {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");

        // Normalize
        const transactions = txs.map(tx => ({
            target: tx.target,
            value: tx.value ?? 0n,
            data: tx.data ?? "0x"
        }));

        try {
            const userOp = await this.userOpBuilder.buildUserOperationBatch(
                this.owner,
                this.smartAccountAddress,
                transactions
            );
            const signed = await this.signUserOperation(userOp);
            const hash = await this.sendUserOperation(signed);
            return await this.waitForUserOperation(hash);
        } catch (error) {
            throw this.decodeError(error);
        }
    }

    async deposit(amount: bigint): Promise<Hash> {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");

        if (this.walletClient) {
            return await this.walletClient.sendTransaction({
                account: this.walletClient.account!,
                to: this.smartAccountAddress,
                value: amount,
                chain: this.chainConfig.chain
            });
        }

        return await window.ethereum!.request({
            method: "eth_sendTransaction",
            params: [{
                from: this.owner,
                to: this.smartAccountAddress,
                value: "0x" + amount.toString(16)
            }]
        }) as Hash;
    }

    /**
     * Smart Transfer: Automatically chooses best method (SA vs EOA) based on balances.
     * Supports strict fee handling.
     */
    async smartTransfer(
        token: Address | string,
        recipient: Address,
        amount: bigint,
        fee?: { amount: bigint; recipient: Address }
    ): Promise<UserOpReceipt | { receipt: { transactionHash: Hash } }> {
        if (!this.owner || !this.smartAccountAddress) throw new Error("Not connected");

        const tokenAddress = this.getTokenAddress(token);
        const isNative = tokenAddress === "0x0000000000000000000000000000000000000000";

        // Refresh State
        const [saBal, eoaBal, allowance] = await Promise.all([
            this.getBalance(token),
            this.getEoaBalance(token),
            isNative ? 0n : this.getAllowance(token).catch(() => 0n)
        ]);

        const totalNeeded = amount + (fee?.amount || 0n);

        // Strategy 1: Smart Account Pay (Preferred)
        if (saBal >= totalNeeded) {
            const txs = [];

            // Transfer to Recipient
            if (isNative) {
                txs.push({ target: recipient, value: amount, data: "0x" as Hex });
            } else {
                txs.push({ target: tokenAddress, value: 0n, data: this.tokenService.encodeTransfer(recipient, amount) });
            }

            // Transfer Fee
            if (fee && fee.amount > 0n) {
                if (isNative) {
                    txs.push({ target: fee.recipient, value: fee.amount, data: "0x" as Hex });
                } else {
                    txs.push({ target: tokenAddress, value: 0n, data: this.tokenService.encodeTransfer(fee.recipient, fee.amount) });
                }
            }
            console.log("SmartTransfer: Using Smart Account");
            return this.sendBatchTransaction(txs);
        }

        // Strategy 2: EOA Pay (Fallback / Pull)
        if (eoaBal >= totalNeeded) {
            if (isNative) {
                // Native EOA Transfer (Direct)
                console.log("SmartTransfer: Using EOA (Native)");
                if (this.walletClient) {
                    const hash = await this.walletClient.sendTransaction({
                        account: this.walletClient.account!,
                        to: recipient,
                        value: amount,
                        chain: this.chainConfig.chain
                    });
                    return { receipt: { transactionHash: hash } };
                }
                const hash = await window.ethereum!.request({
                    method: "eth_sendTransaction",
                    params: [{ from: this.owner, to: recipient, value: "0x" + amount.toString(16) }]
                }) as Hash;
                return { receipt: { transactionHash: hash } };
            } else {
                // ERC-20 EOA Pull (TransferFrom)
                console.log("SmartTransfer: Using EOA (Pull)");
                // Check allowance
                if (allowance < totalNeeded) {
                    // Infinite approval standard: maxUint256
                    throw new Error(`Approval required. Please approve ${token} usage.`);
                }

                const txs = [];
                // Pull to Recipient
                txs.push({
                    target: tokenAddress,
                    value: 0n,
                    data: this.tokenService.encodeTransferFrom(this.owner, recipient, amount)
                });

                // Pull Fee
                if (fee && fee.amount > 0n) {
                    txs.push({
                        target: tokenAddress,
                        value: 0n,
                        data: this.tokenService.encodeTransferFrom(this.owner, fee.recipient, fee.amount)
                    });
                }
                return this.sendBatchTransaction(txs);
            }
        }

        throw new Error(`Insufficient funds.`);
    }

    async transfer(
        token: Address | string,
        recipient: Address,
        amount: bigint
    ): Promise<UserOpReceipt> {
        const tokenAddress = this.getTokenAddress(token);

        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
            return this.sendTransaction({
                target: recipient,
                value: amount,
                data: "0x"
            });
        }

        // ERC-20
        const data = this.tokenService.encodeTransfer(recipient, amount);
        return this.sendTransaction({
            target: tokenAddress,
            value: 0n,
            data
        });
    }

    /**
     * Approve a token for the Smart Account
     */
    async approveToken(
        token: Address,
        spender: Address,
        amount: bigint = 115792089237316195423570985008687907853269984665640564039457584007913129639935n
    ): Promise<Hash | "NOT_NEEDED"> {
        if (!this.owner) throw new Error("Not connected");

        const support = await this.requestApprovalSupport(token, spender, amount);

        if (support.type === "approve") {
            const data = this.tokenService.encodeApprove(spender, amount);

            if (this.walletClient) {
                return await this.walletClient.sendTransaction({
                    account: this.walletClient.account!,
                    to: token,
                    data,
                    chain: this.chainConfig.chain
                });
            }

            return await window.ethereum!.request({
                method: "eth_sendTransaction",
                params: [{
                    from: this.owner,
                    to: token,
                    data,
                }]
            }) as Hash;
        }

        if (support.type === "permit") throw new Error("Permit not yet supported");
        return "NOT_NEEDED";
    }

    // --- Core Bridge to Bundler/UserOp ---

    async signUserOperation(userOp: UserOperation): Promise<UserOperation> {
        if (!this.owner) throw new Error("Not connected");

        const userOpHash = this.userOpBuilder.getUserOpHash(userOp);
        let signature: Hex;

        if (this.walletClient) {
            signature = await this.walletClient.signMessage({
                account: this.walletClient.account!,
                message: { raw: userOpHash } // Sign hash directly
            });
        } else {
            signature = (await window.ethereum!.request({
                method: "personal_sign",
                params: [userOpHash, this.owner],
            })) as Hex;
        }

        return { ...userOp, signature };
    }

    async sendUserOperation(userOp: UserOperation): Promise<Hash> {
        return this.bundlerClient.sendUserOperation(userOp);
    }

    async waitForUserOperation(hash: Hash, timeout = 60000) {
        return this.bundlerClient.waitForUserOperation(hash, timeout);
    }

    // Internal but exposed via BundlerClient originally
    async requestApprovalSupport(token: Address, spender: Address, amount: bigint): Promise<ApprovalSupportResult> {
        if (!this.owner) throw new Error("Not connected");
        return this.bundlerClient.requestApprovalSupport(token, this.owner, spender, amount);
    }

    // Error Decoding (Private)
    private decodeError(error: any): Error {
        const msg = error?.message || "";
        const hexMatch = msg.match(/(0x[0-9a-fA-F]+)/);

        if (hexMatch) {
            try {
                const decoded = decodeErrorResult({
                    abi: [{ inputs: [{ name: "message", type: "string" }], name: "Error", type: "error" }],
                    data: hexMatch[0] as Hex
                });
                if (decoded.errorName === "Error") return new Error(`Smart Account Error: ${decoded.args[0]}`);
            } catch (e) { /* ignore */ }
        }

        if (msg.includes("AA21")) return new Error("Smart Account: Native transfer failed (ETH missing?)");
        if (msg.includes("AA25")) return new Error("Smart Account: Invalid account nonce");

        return error instanceof Error ? error : new Error(String(error));
    }

    // Getters
    getOwner() { return this.owner; }
    getSmartAccount() { return this.smartAccountAddress; }
}

// Global window types for MetaMask
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, callback: (args: unknown) => void) => void;
            removeListener: (event: string, callback: (args: unknown) => void) => void;
        };
    }
}
