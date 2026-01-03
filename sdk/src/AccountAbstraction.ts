import {
    createPublicClient,
    http,
    encodeFunctionData,
    encodeAbiParameters,
    keccak256,
    type Address,
    type Hash,
    type Hex,
    type PublicClient
} from "viem";
import {
    factoryAbi,
    entryPointAbi,
    smartAccountAbi,
    erc20Abi,
} from "./constants";
import {
    type ChainConfig,
    type UserOperation,
    type GasEstimate,
    type UserOpReceipt,
    type ApprovalSupportResult
} from "./types";
import { DEPLOYMENTS } from "./deployments";
import { BundlerClient } from "./BundlerClient";

/**
 * ERC-4337 Account Abstraction Client
 */
export class AccountAbstraction {
    private owner: Address | null = null;
    private smartAccountAddress: Address | null = null;
    private chainConfig: ChainConfig;
    private publicClient: PublicClient;
    private bundlerClient: BundlerClient;

    // Resolved addresses
    private entryPointAddress: Address;
    private factoryAddress: Address;
    private paymasterAddress?: Address;
    private usdcAddress: Address;

    constructor(chainConfig: ChainConfig) {
        this.chainConfig = chainConfig;
        const chainId = chainConfig.chain.id;
        const defaults = DEPLOYMENTS[chainId];

        // Resolve addresses (Config > Defaults > Error)
        const entryPoint = chainConfig.entryPointAddress || defaults?.entryPoint;
        if (!entryPoint) throw new Error(`EntryPoint address not found for chain ${chainId}`);
        this.entryPointAddress = entryPoint;

        const factory = chainConfig.factoryAddress || defaults?.factory;
        if (!factory) throw new Error(`Factory address not found for chain ${chainId}`);
        this.factoryAddress = factory;

        const usdc = chainConfig.usdcAddress || defaults?.usdc;
        if (!usdc) throw new Error(`USDC address not found for chain ${chainId}`);
        this.usdcAddress = usdc;

        this.paymasterAddress = chainConfig.paymasterAddress || defaults?.paymaster;

        // Use provided RPC or default from chain
        const rpcUrl = chainConfig.rpcUrl || chainConfig.chain.rpcUrls.default.http[0];

        this.publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(rpcUrl),
        });

        this.bundlerClient = new BundlerClient(chainConfig, this.entryPointAddress);
    }

    /**
     * Connect to MetaMask and get the owner address
     */
    async connect(): Promise<{ owner: Address; smartAccount: Address }> {
        if (typeof window === "undefined" || !window.ethereum) {
            throw new Error("MetaMask is not installed");
        }

        // Request account access
        const accounts = (await window.ethereum.request({
            method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found");
        }

        // Check network
        const chainId = (await window.ethereum.request({
            method: "eth_chainId",
        })) as string;

        const targetChainId = this.chainConfig.chain.id;

        if (parseInt(chainId, 16) !== targetChainId) {
            // Switch to configured chain
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x" + targetChainId.toString(16) }],
                });
            } catch (switchError: unknown) {
                const error = switchError as { code?: number };
                // Chain not added, add it
                if (error.code === 4902) {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: "0x" + targetChainId.toString(16),
                                chainName: this.chainConfig.chain.name,
                                nativeCurrency: this.chainConfig.chain.nativeCurrency,
                                rpcUrls: [this.chainConfig.rpcUrl],
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
        this.smartAccountAddress = await this.getSmartAccountAddress(this.owner);

        return {
            owner: this.owner,
            smartAccount: this.smartAccountAddress,
        };
    }

    /**
     * Get the Smart Account address for an owner (counterfactual)
     */
    async getSmartAccountAddress(owner: Address): Promise<Address> {
        const address = await this.publicClient.readContract({
            address: this.factoryAddress,
            abi: factoryAbi,
            functionName: "getAccountAddress",
            args: [owner, 0n], // salt = 0
        }) as Address;
        return address;
    }

    /**
     * Check if the Smart Account is deployed
     */
    async isAccountDeployed(): Promise<boolean> {
        if (!this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        const code = await this.publicClient.getCode({
            address: this.smartAccountAddress,
        });
        return code !== undefined && code !== "0x";
    }


    /**
     * Get the USDC balance of the Smart Account
     */
    async getUsdcBalance(): Promise<bigint> {
        if (!this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        return await this.publicClient.readContract({
            address: this.usdcAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [this.smartAccountAddress],
        }) as bigint;
    }


    /**
     * Get the EOA's USDC balance
     */
    async getEoaUsdcBalance(): Promise<bigint> {
        if (!this.owner) {
            throw new Error("Not connected");
        }

        return await this.publicClient.readContract({
            address: this.usdcAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [this.owner],
        }) as bigint;
    }

    /**
     * Get the allowance of the Smart Account to spend the EOA's USDC
     */
    async getAllowance(): Promise<bigint> {
        if (!this.owner || !this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        return await this.publicClient.readContract({
            address: this.usdcAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [this.owner, this.smartAccountAddress],
        }) as bigint;
    }

    /**
     * Get the nonce for the Smart Account
     */
    async getNonce(): Promise<bigint> {
        if (!this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        return await this.publicClient.readContract({
            address: this.entryPointAddress,
            abi: entryPointAbi,
            functionName: "getNonce",
            args: [this.smartAccountAddress, 0n],
        }) as bigint;
    }

    /**
     * Build initCode for account deployment
     */
    buildInitCode(): Hex {
        if (!this.owner) {
            throw new Error("Not connected");
        }

        const createAccountData = encodeFunctionData({
            abi: factoryAbi,
            functionName: "createAccount",
            args: [this.owner, 0n],
        });

        return `${this.factoryAddress}${createAccountData.slice(2)}` as Hex;
    }


    /**
     * Estimate gas for a UserOperation
     */
    async estimateGas(userOp: Partial<UserOperation>): Promise<GasEstimate> {
        return this.bundlerClient.estimateGas(userOp);
    }


    /**
     * Build a UserOperation for Batched Execution (e.g. USDC Transfer + Fee)
     */
    async buildUserOperationBatch(
        transactions: { target: Address; value: bigint; data: Hex }[]
    ): Promise<UserOperation> {
        if (!this.owner || !this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        const isDeployed = await this.isAccountDeployed();
        const initCode = isDeployed ? "0x" : this.buildInitCode();

        // Prepare arrays for executeBatch
        const targets = transactions.map((tx) => tx.target);
        const values = transactions.map((tx) => tx.value);
        const datas = transactions.map((tx) => tx.data);

        // Encode callData for executeBatch
        const callData = encodeFunctionData({
            abi: smartAccountAbi,
            functionName: "executeBatch",
            args: [targets, values, datas],
        });

        const nonce = await this.getNonce();

        // Estimate gas
        const gasEstimate = await this.estimateGas({
            sender: this.smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData,
            paymasterAndData: this.paymasterAddress as Hex,
        });

        return {
            sender: this.smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData,
            callGasLimit: BigInt(gasEstimate.callGasLimit),
            verificationGasLimit: BigInt(gasEstimate.verificationGasLimit),
            preVerificationGas: BigInt(gasEstimate.preVerificationGas),
            maxFeePerGas: BigInt(gasEstimate.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasEstimate.maxPriorityFeePerGas),
            paymasterAndData: this.paymasterAddress as Hex,
            signature: "0x",
        };
    }

    /**
     * Build a UserOperation to ONLY deploy the account (empty callData)
     */
    async buildDeployUserOperation(): Promise<UserOperation> {
        if (!this.owner || !this.smartAccountAddress) {
            throw new Error("Not connected");
        }

        const isDeployed = await this.isAccountDeployed();
        if (isDeployed) {
            throw new Error("Account is already deployed");
        }

        const initCode = this.buildInitCode();
        const callData = "0x"; // Empty callData for deployment only
        const nonce = await this.getNonce();

        // Estimate gas
        const gasEstimate = await this.estimateGas({
            sender: this.smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData,
            paymasterAndData: this.paymasterAddress as Hex,
        });

        return {
            sender: this.smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData,
            callGasLimit: BigInt(gasEstimate.callGasLimit),
            verificationGasLimit: BigInt(gasEstimate.verificationGasLimit),
            preVerificationGas: BigInt(gasEstimate.preVerificationGas),
            maxFeePerGas: BigInt(gasEstimate.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasEstimate.maxPriorityFeePerGas),
            paymasterAndData: this.paymasterAddress as Hex,
            signature: "0x",
        };
    }

    /**
     * Calculate the UserOperation hash
     */
    getUserOpHash(userOp: UserOperation): Hex {
        const packed = encodeAbiParameters(
            [
                { type: "address" },
                { type: "uint256" },
                { type: "bytes32" },
                { type: "bytes32" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "bytes32" },
            ],
            [
                userOp.sender,
                userOp.nonce,
                keccak256(userOp.initCode),
                keccak256(userOp.callData),
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                keccak256(userOp.paymasterAndData),
            ]
        );

        const packedHash = keccak256(packed);

        return keccak256(
            encodeAbiParameters(
                [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
                [packedHash, this.entryPointAddress, BigInt(this.chainConfig.chain.id)]
            )
        );
    }

    /**
     * Sign a UserOperation with MetaMask
     */
    async signUserOperation(userOp: UserOperation): Promise<UserOperation> {
        if (!this.owner) {
            throw new Error("Not connected");
        }

        const userOpHash = this.getUserOpHash(userOp);

        // Sign with MetaMask using personal_sign (EIP-191)
        const signature = (await window.ethereum!.request({
            method: "personal_sign",
            params: [userOpHash, this.owner],
        })) as Hex;

        return {
            ...userOp,
            signature,
        };
    }

    /**
     * Send a signed UserOperation to the bundler
     */
    async sendUserOperation(userOp: UserOperation): Promise<Hash> {
        return this.bundlerClient.sendUserOperation(userOp);
    }

    /**
     * Wait for a UserOperation to be confirmed
     */
    async waitForUserOperation(
        userOpHash: Hash,
        timeout = 60000
    ): Promise<UserOpReceipt> {
        return this.bundlerClient.waitForUserOperation(userOpHash, timeout);
    }


    /**
     * Request support for token approval (fund if needed)
     */
    async requestApprovalSupport(
        token: Address,
        spender: Address,
        amount: bigint
    ): Promise<ApprovalSupportResult> {
        if (!this.owner) {
            throw new Error("Not connected");
        }
        return this.bundlerClient.requestApprovalSupport(token, this.owner, spender, amount);
    }

    /**
     * Deploy the Smart Account
     */
    async deployAccount(): Promise<UserOpReceipt> {
        const userOp = await this.buildDeployUserOperation();
        const signed = await this.signUserOperation(userOp);
        const hash = await this.sendUserOperation(signed);
        return await this.waitForUserOperation(hash);
    }

    /**
     * Approve a token for the Smart Account (EOA -> Token -> Smart Account)
     * Checks for gas sponsorship (Relayer funding) if needed.
     */
    async approveToken(
        token: Address,
        spender: Address,
        amount: bigint = 115792089237316195423570985008687907853269984665640564039457584007913129639935n // maxUint256
    ): Promise<Hash | "NOT_NEEDED"> {
        if (!this.owner) throw new Error("Not connected");

        // 1. Check if we need funding
        const support = await this.requestApprovalSupport(token, spender, amount);

        if (support.type === "approve") {
            // 2. Encode approve data
            const data = encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [spender, amount]
            });

            // 3. Send transaction via Wallet (MetaMask)
            // If funding was needed, the Relayer has already sent ETH to this.owner
            const txHash = await window.ethereum!.request({
                method: "eth_sendTransaction",
                params: [{
                    from: this.owner,
                    to: token,
                    data,
                }]
            }) as Hash;

            return txHash;
        }

        if (support.type === "permit") {
            throw new Error("Permit not yet supported in this SDK version");
        }

        return "NOT_NEEDED";
    }

    // Getters
    getOwner(): Address | null {
        return this.owner;
    }

    getSmartAccount(): Address | null {
        return this.smartAccountAddress;
    }
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
