# ERC-4337 Gasless SDK ⛽️

A lightweight, typed SDK to integrate Account Abstraction (ERC-4337) and Cross-Chain transfers into your dApp. It handles Smart Account creation, gasless transactions, and orchestrates cross-chain bridges.

## 📦 Installation

```bash
npm install @1llet.xyz/erc4337-gasless-sdk viem
# or
yarn add @1llet.xyz/erc4337-gasless-sdk viem
```

## 🚀 Quick Start (Account Abstraction)

### 1. Configuration & Initialization

Import chain configurations directly from the SDK.

```typescript
import { BASE_MAINNET, AccountAbstraction } from "@1llet.xyz/erc4337-gasless-sdk";

// Initialize with a supported chain
const aa = new AccountAbstraction(BASE_MAINNET);
```

### 2. Connect Wallet

Supports **Browser (MetaMask)** and **Private Key (Server)**.

```typescript
// A. Browser (MetaMask / Injected)
const { owner, smartAccount } = await aa.connect();

// B. Private Key (Backend / Bots)
const { owner, smartAccount } = await aa.connect("0xMY_PRIVATE_KEY");

console.log("EOA:", owner);
console.log("Smart Account:", smartAccount);
```

### 3. Send Gasless Transactions

Transactions are sponsored by the Paymaster automatically.

```typescript
// 1. Transfer ERC-20 (USDC)
await aa.transfer("USDC", recipientAddress, 1000000n); // 1 USDC (6 decimals)

// 2. Transfer Native Token (ETH/DAI/MATIC)
// The SDK detects the native asset from chain config
await aa.transfer("ETH", recipientAddress, parseEther("0.1")); 

// 3. Any Contract Call (e.g. Mint NFT)
await aa.sendTransaction({
    target: "0xNftContract",
    data: encodeFunctionData({ ... })
});
```

---

## 🌉 Cross-Chain Transfer Manager

The `TransferManager` orchestrates transfers between chains, choosing the best strategy (CCTP, Near Intents) or signaling a direct transfer if on the same chain.

```typescript
import { TransferManager, BridgeContext } from "@1llet.xyz/erc4337-gasless-sdk";

const transferManager = new TransferManager();

const context: BridgeContext = {
    sourceChain: "Base",
    destChain: "Optimism",
    sourceToken: "USDC",
    destToken: "USDC",
    amount: "10.5", // Human readable string
    recipient: "0xRecipient...",
    senderAddress: "0xSender...",
    facilitatorPrivateKey: "0x..." // For CCTP/Near verification usage (Backend)
};

const result = await transferManager.execute(context);

if (result.success) {
    if (result.transactionHash === "DIRECT_TRANSFER_REQUIRED") {
        // Signal to Client: Execute direct transfer on same chain!
        console.log("Execute local transfer:", result.data);
    } else {
        // Cross-chain initiated
        console.log("Bridge Tx:", result.transactionHash);
    }
} else {
    console.error("Error:", result.errorReason);
}
```

## 🛠️ Supported Chains

The SDK exports pre-configured objects:

- `BASE_MAINNET`
- `BASE_SEPOLIA`
- `OPTIMISM_MAINNET`
- `GNOSIS_MAINNET`

```typescript
import { GNOSIS_MAINNET } from "@1llet.xyz/erc4337-gasless-sdk";
```

## 📄 API Reference

### AccountAbstraction

| Method | Description |
|--------|-------------|
| `connect(privateKey?)` | Connects to wallet and calculates Smart Account address |
| `isAccountDeployed()` | Checks if Smart Account exists on-chain |
| `deployAccount()` | Deploys the Smart Account (usually updated automatically on first tx) |
| `transfer(token, to, amount)` | Simplest way to send tokens or ETH |
| `sendTransaction(tx)` | Send a raw transaction (target, value, data) |
| `sendBatchTransaction(txs)` | Send multiple transactions in one UserOp (Atomic) |
| `approveToken(token, spender, amount)` | Approve a spender (handles gasless logic if needed) |
| `getSmartAccountAddress(owner)` | Get deterministic address for any EOA |

### Utilities

```typescript
import { CHAIN_CONFIGS } from "@1llet.xyz/erc4337-gasless-sdk";

// Access config by Chain ID
const config = CHAIN_CONFIGS[8453];
```

## License

MIT
