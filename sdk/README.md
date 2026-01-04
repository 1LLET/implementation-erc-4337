# ERC-4337 Gasless SDK ⛽️

A lightweight, typed SDK to integrate Account Abstraction (ERC-4337) into your dApp. It handles Smart Account creation, gasless transactions, and token approvals seamlessly.

## 📦 Installation

```bash
npm install @1llet.xyz/erc4337-gasless-sdk viem
# or
yarn add @1llet.xyz/erc4337-gasless-sdk viem
```

## 🚀 Quick Start

### 1. Configuration

Define the chain configuration (including your Bundler URL and Paymaster).

```typescript
// 1. Import Config (Chain Registry)
import { BASE_SEPOLIA, type ChainConfig } from "@1llet.xyz/erc4337-gasless-sdk";
import { AccountAbstraction } from "@1llet.xyz/erc4337-gasless-sdk";

// 2. Initialize
const aa = new AccountAbstraction(BASE_SEPOLIA);

await aa.connect();
```

### 2. Initialize & Connect

Two modes are supported: **Browser (MetaMask)** and **Server/Script (Private Key)**.

#### Option A: Browser (MetaMask)

```typescript
import { AccountAbstraction } from "@1llet.xyz/erc4337-gasless-sdk";

const aa = new AccountAbstraction(config);

// Connect to MetaMask (or any injected provider)
// This calculates the Smart Account address deterministically (Counterfactual)
const { owner, smartAccount } = await aa.connect();

console.log("EOA Owner:", owner);
console.log("Smart Account:", smartAccount);
```

#### Option B: Server / Backend (Private Key)

Initialize with a private key to sign transactions locally (no popup). Useful for bots or backends.

```typescript
const PRIVATE_KEY = "0x..."; // Your EOA Private Key

// Connect using the private key
const { owner, smartAccount } = await aa.connect(PRIVATE_KEY);

console.log("Local Signer:", owner);
// seamless transaction execution...
await aa.transfer("USDC", recipient, amount); 
```

### 3. Send a Gasless Transaction

Send a transaction where the Gas is paid by the Paymaster (sponsored).

```typescript
import { encodeFunctionData, parseAbi } from "viem";

// Example: Calling a precise function on a contract
const myContractAbi = parseAbi(["function safeMint(address to)"]);
const callData = encodeFunctionData({
  abi: myContractAbi,
  functionName: "safeMint",
  args: [smartAccount]
});

// Build the UserOperation
// This automatically handles: InitCode (if not deployed), Gas Estimation, and Paymaster data
const userOp = await aa.buildUserOperationBatch([
  {
    target: "0xMyNftContract...",
    value: 0n,
    data: callData
  }
]);

// Sign with the EOA (MetaMask)
const signedOp = await aa.signUserOperation(userOp);

// Send to Bundler
const userOpHash = await aa.sendUserOperation(signedOp);
console.log("Transaction sent! Hash:", userOpHash);

// Wait for confirmation
const receipt = await aa.waitForUserOperation(userOpHash);
console.log("Transaction confirmed in block:", receipt.receipt.blockNumber);
```

### 4. Special Feature: Approval Support

Fund the user's EOA with native ETH (via the Paymaster/Bundler) if they need to execute a legacy `approve` transaction and have no gas.

```typescript
try {
  const result = await aa.requestApprovalSupport(
    usdcAddress,
    spenderAddress, 
    amount
  );
  
  if (result.fundingNeeded) {
    console.log(`User was funded with ${result.fundedAmount} ETH to pay for gas!`);
  }
} catch (e) {
  console.error("Failed to fund user:", e);
}
```

## 🛠️ Build Locally

```bash
git clone https://github.com/your-repo/erc4337-gasless-sdk.git
cd erc4337-gasless-sdk
npm install
npm run build
```

## � API Reference

### Balances & Allowances

```typescript
// Get Smart Account USDC Balance
const balance = await aa.getUsdcBalance();

// Get EOA (Wallet) USDC Balance
const eoaBalance = await aa.getEoaUsdcBalance();

// Check how much USDC the Smart Account is allowed to spend from EOA
const allowance = await aa.getAllowance();
```

### Account Management

```typescript
// Check if the Smart Account is already deployed on-chain
const isDeployed = await aa.isAccountDeployed();

// Get the Counterfactual Address (deterministic address based on owner)
const address = await aa.getSmartAccountAddress(ownerAddress);

// Deploy the account (Abstracts build -> sign -> send -> wait)
// Returns the transaction receipt
const receipt = await aa.deployAccount();
```

### Simplified Transactions (v0.2.0+)

Send transactions without manually building, signing, and waiting.

```typescript
// 1. Send ETH or Call Contract (Single)
const receipt = await aa.sendTransaction({
    target: "0x123...",
    value: 1000000000000000000n, // 1 ETH
    data: "0x..." // Optional callData
});

// 2. Send Multiple Transactions (Batch)
// Great for approving + swapping, or multiple transfers
const receipt = await aa.sendBatchTransaction([
    { target: "0xToken...", data: encodeApproveData },
    { target: "0xSwap...", data: encodeSwapData }
]);

// 3. Transfer ERC-20 Tokens (Helper)
// Automatically encodes the
// 1. Transfer ERC-20 (USDC)
await aa.transfer("USDC", recipient, amount);

// 2. Transfer Native Token (ETH)
// The SDK detects the "ETH" symbol and sends a native transaction
await aa.transfer("ETH", recipient, amount);
```

// 2. Transfer Native Token (ETH)
// The SDK detects the "ETH" symbol and sends a native transaction
await aa.transfer("ETH", recipient, amount);
```

### Funding the Account

Easily deposit ETH from the connected wallet (EOA) to the Smart Account.

```typescript
// Deposit 0.1 ETH
const txHash = await aa.deposit(100000000000000000n);
```

### High-Level Methods

### Error Decoding
The SDK now automatically tries to decode cryptic "0x..." errors from the EntryPoint into readable messages like:
- `Smart Account Error: Transfer amount exceeds balance`
- `Smart Account: Native transfer failed`

### Simplified Approvals

```typescript
// Approve a token for a spender (e.g. Smart Account)
// Automatically handles:
// 1. Checks if funding is needed (Gasless flow support)
// 2. Encodes function data
// 3. Sends transaction via Wallet
// Returns the txHash or "NOT_NEEDED"
const txHash = await aa.approveToken(usdcAddress, spenderAddress, amount);
```

### Utilities

```typescript
// Get current Nonce
const nonce = await aa.getNonce();

// Get UserOp Hash (for manual signing or verification)
const hash = aa.getUserOpHash(userOp);
```

### Constants & Exports

The SDK exports useful constants and ABIs so you don't need to redefine them:

```typescript
import { 
  DEPLOYMENTS, 
  erc20Abi, 
  factoryAbi, 
  entryPointAbi 
} from "@1llet.xyz/erc4337-gasless-sdk";

// Access known contract addresses
const usdcOnBase = DEPLOYMENTS[8453].usdc;

// Use ABIs directly
console.log(erc20Abi);
```

## �📄 License

MIT
