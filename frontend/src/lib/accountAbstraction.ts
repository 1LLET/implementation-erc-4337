import {
  createPublicClient,
  http,
  encodeFunctionData,
  encodeAbiParameters,
  keccak256,
  type Address,
  type Hash,
  type Hex,
  parseEther,
  formatEther,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  config,
  factoryAbi,
  entryPointAbi,
  smartAccountAbi,
  erc20Abi,
} from "@/config/contracts";

// Types
export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

export interface GasEstimate {
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface UserOpReceipt {
  userOpHash: Hash;
  sender: Address;
  success: boolean;
  actualGasCost: string;
  receipt: {
    transactionHash: Hash;
    blockNumber: string;
  };
}

// Public client for reading blockchain state
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

/**
 * AccountAbstraction class for interacting with ERC-4337
 */
export class AccountAbstraction {
  private owner: Address | null = null;
  private smartAccountAddress: Address | null = null;

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

    if (parseInt(chainId, 16) !== config.chainId) {
      // Switch to Base Sepolia
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + config.chainId.toString(16) }],
        });
      } catch (switchError: unknown) {
        const error = switchError as { code?: number };
        // Chain not added, add it
        if (error.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x" + config.chainId.toString(16),
                chainName: "Base Sepolia",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
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
    const address = await publicClient.readContract({
      address: config.factoryAddress,
      abi: factoryAbi,
      functionName: "getAccountAddress",
      args: [owner, 0n], // salt = 0
    });
    return address;
  }

  /**
   * Check if the Smart Account is deployed
   */
  async isAccountDeployed(): Promise<boolean> {
    if (!this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    const code = await publicClient.getCode({
      address: this.smartAccountAddress,
    });
    return code !== undefined && code !== "0x";
  }

  /**
   * Get the ETH balance of the Smart Account
   */
  async getSmartAccountBalance(): Promise<bigint> {
    if (!this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    return await publicClient.getBalance({
      address: this.smartAccountAddress,
    });
  }

  /**
   * Get the USDC balance of the Smart Account
   */
  async getUsdcBalance(): Promise<bigint> {
    if (!this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    return await publicClient.readContract({
      address: config.usdcAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [this.smartAccountAddress],
    });
  }


  /**
   * Get the EOA's USDC balance
   */
  async getEoaUsdcBalance(): Promise<bigint> {
    if (!this.owner) {
      throw new Error("Not connected");
    }

    return await publicClient.readContract({
      address: config.usdcAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [this.owner],
    });
  }

  /**
   * Get the allowance of the Smart Account to spend the EOA's USDC
   */
  async getAllowance(): Promise<bigint> {
    if (!this.owner || !this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    return await publicClient.readContract({
      address: config.usdcAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [this.owner, this.smartAccountAddress],
    });
  }

  /**
   * Get the nonce for the Smart Account
   */
  async getNonce(): Promise<bigint> {
    if (!this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    return await publicClient.readContract({
      address: config.entryPointAddress,
      abi: entryPointAbi,
      functionName: "getNonce",
      args: [this.smartAccountAddress, 0n],
    });
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

    return `${config.factoryAddress}${createAccountData.slice(2)}` as Hex;
  }

  /**
   * Build callData for a simple ETH transfer
   */
  buildTransferCallData(to: Address, value: bigint): Hex {
    return encodeFunctionData({
      abi: smartAccountAbi,
      functionName: "execute",
      args: [to, value, "0x"],
    });
  }

  /**
   * Build callData for a USDC transfer
   */
  buildUsdcTransferCallData(to: Address, amount: bigint): Hex {
    // Encode the ERC20 transfer call
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, amount],
    });

    // Wrap it in the smart account's execute function
    return encodeFunctionData({
      abi: smartAccountAbi,
      functionName: "execute",
      args: [config.usdcAddress, 0n, transferData],
    });
  }

  /**
   * Estimate gas for a UserOperation
   */
  async estimateGas(userOp: Partial<UserOperation>): Promise<GasEstimate> {
    const response = await fetch(config.bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_estimateUserOperationGas",
        params: [
          {
            sender: userOp.sender,
            nonce: userOp.nonce ? "0x" + userOp.nonce.toString(16) : "0x0",
            initCode: userOp.initCode || "0x",
            callData: userOp.callData || "0x",
            paymasterAndData: userOp.paymasterAndData || "0x",
            signature: "0x",
          },
          config.entryPointAddress,
        ],
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  }

  /**
   * Build a complete UserOperation for ETH transfer
   */
  async buildUserOperation(
    to: Address,
    value: bigint
  ): Promise<UserOperation> {
    if (!this.owner || !this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    const isDeployed = await this.isAccountDeployed();
    const initCode = isDeployed ? "0x" : this.buildInitCode();
    const callData = this.buildTransferCallData(to, value);
    const nonce = await this.getNonce();

    // Estimate gas
    const gasEstimate = await this.estimateGas({
      sender: this.smartAccountAddress,
      nonce,
      initCode: initCode as Hex,
      callData,
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
      signature: "0x",
    };
  }

  /**
   * Build a complete UserOperation for USDC transfer
   */
  async buildUserOperationUsdc(
    to: Address,
    amount: bigint
  ): Promise<UserOperation> {
    if (!this.owner || !this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    const isDeployed = await this.isAccountDeployed();
    const initCode = isDeployed ? "0x" : this.buildInitCode();
    const callData = this.buildUsdcTransferCallData(to, amount);
    const nonce = await this.getNonce();

    // Estimate gas
    const gasEstimate = await this.estimateGas({
      sender: this.smartAccountAddress,
      nonce,
      initCode: initCode as Hex,
      callData,
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
      signature: "0x",
    };
  }

  /**
   * Build a complete UserOperation for USDC transfer using transferFrom (EOA -> Recipient)
   */
  /**
   * Build a complete UserOperation for USDC transfer using transferFrom (EOA -> Recipient)
   */
  async buildUserOperationUsdcFromEoa(
    to: Address,
    amount: bigint
  ): Promise<UserOperation> {
    if (!this.owner || !this.smartAccountAddress) {
      throw new Error("Not connected");
    }

    const isDeployed = await this.isAccountDeployed();
    const initCode = isDeployed ? "0x" : this.buildInitCode();

    // ERC20 transferFrom call: transferFrom(owner, to, amount)
    // The Smart Account calls this on the USDC contract.
    const transferFromData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transferFrom",
      args: [this.owner, to, amount],
    });

    // Wrap it in the smart account's execute function
    const callData = encodeFunctionData({
      abi: smartAccountAbi,
      functionName: "execute",
      args: [config.usdcAddress, 0n, transferFromData],
    });

    const nonce = await this.getNonce();

    // Estimate gas
    const gasEstimate = await this.estimateGas({
      sender: this.smartAccountAddress,
      nonce,
      initCode: initCode as Hex,
      callData,
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
      signature: "0x",
    };
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
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
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
      paymasterAndData: config.paymasterAddress as Hex,
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
        [packedHash, config.entryPointAddress, BigInt(config.chainId)]
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
    const response = await fetch(config.bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [
          {
            sender: userOp.sender,
            nonce: "0x" + userOp.nonce.toString(16),
            initCode: userOp.initCode,
            callData: userOp.callData,
            callGasLimit: "0x" + userOp.callGasLimit.toString(16),
            verificationGasLimit: "0x" + userOp.verificationGasLimit.toString(16),
            preVerificationGas: "0x" + userOp.preVerificationGas.toString(16),
            maxFeePerGas: "0x" + userOp.maxFeePerGas.toString(16),
            maxPriorityFeePerGas: "0x" + userOp.maxPriorityFeePerGas.toString(16),
            paymasterAndData: userOp.paymasterAndData,
            signature: userOp.signature,
          },
          config.entryPointAddress,
        ],
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result as Hash;
  }

  /**
   * Wait for a UserOperation to be confirmed
   */
  async waitForUserOperation(
    userOpHash: Hash,
    timeout = 60000
  ): Promise<UserOpReceipt> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await fetch(config.bundlerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getUserOperationReceipt",
          params: [userOpHash],
        }),
      });

      const result = await response.json();
      if (result.result) {
        return result.result as UserOpReceipt;
      }

      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("Timeout waiting for UserOperation");
  }

  /**
   * High-level method to transfer ETH
   */
  async transferNative(
    to: Address,
    amountEther: string
  ): Promise<{ userOpHash: Hash; receipt: UserOpReceipt }> {
    const value = parseEther(amountEther);

    // Build the UserOperation
    const userOp = await this.buildUserOperation(to, value);

    // Sign it
    const signedUserOp = await this.signUserOperation(userOp);

    // Send it
    const userOpHash = await this.sendUserOperation(signedUserOp);

    // Wait for confirmation
    const receipt = await this.waitForUserOperation(userOpHash);

    return { userOpHash, receipt };
  }

  /**
   * Request support for token approval (fund if needed)
   */
  async requestApprovalSupport(
    token: Address,
    spender: Address,
    amount: bigint
  ): Promise<{
    type: "permit" | "approve" | "none";
    gasCost?: string;
    fundingNeeded?: string;
    fundedAmount?: string;
  }> {
    if (!this.owner) {
      throw new Error("Not connected");
    }

    const response = await fetch(config.bundlerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_requestApprovalSupport",
        params: [token, this.owner, spender, amount.toString()],
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
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
