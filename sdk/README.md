# ERC-4337 Gasless SDK ⛽️

A lightweight, typed SDK to integrate Account Abstraction (ERC-4337) and Cross-Chain transfers into your dApp. It handles Smart Account creation, gasless transactions, and orchestrates cross-chain bridges strategies including CCTP and Near Intents.

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

The `TransferManager` orchestrates transfers between chains, choosing the best strategy (**CCTP**, **Near Intents**) or signaling a **Direct Transfer** if on the same chain.

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
    
    // Optional: Provide depositTxHash if you already made the deposit
    depositTxHash: "0x...", 
    
    // Optional: For Stellar source
    paymentPayload: {
        signedXDR: "AAAA..."
    }
};

const result = await transferManager.execute(context);

if (result.success) {
    if (result.transactionHash === "DIRECT_TRANSFER_REQUIRED") {
        // Signal to Client: Execute direct transfer on same chain!
        console.log("Execute local transfer:", result.data);
    } else {
        // Cross-chain initiated (or Deposit Address returned for Near)
        console.log("Bridge Tx / Deposit Address:", result.data);
    }
} else {
    console.error("Error:", result.errorReason);
}
```

### Simulation (Quote)

You can simulate a simulation to estimate fees and received amount before executing.

```typescript
import { getNearSimulation } from "@1llet.xyz/erc4337-gasless-sdk";

const simulation = await getNearSimulation(
    "Base", 
    "Gnosis", 
    "10", 
    "USDC", // Source
    "EURe"  // Destination
);

if (simulation.success) {
    console.log(`Fee: ${simulation.protocolFee}`);
    console.log(`Est. Received: ${simulation.estimatedReceived}`);
} else {
    console.error(simulation.error);
}
```

---

## 🌟 Stellar Service

The SDK includes a dedicated `StellarService` to handle non-EVM interactions, useful for bridging from Stellar to EVM.

```typescript
import { StellarService } from "@1llet.xyz/erc4337-gasless-sdk";

const stellar = new StellarService();

// 1. Get Balance
const balance = await stellar.getBalance("G...", "USDC");

// 2. Build Transfer XDR (for bridging)
const xdr = await stellar.buildTransferXdr(
    "S_SENDER_PRIVATE_KEY", 
    "G_RECIPIENT_ADDRESS", 
    "10", // Amount 
    "USDC",
    "MEMO_IF_NEEDED"
);

// 3. Submit Transaction
const hash = await stellar.submitXdr(xdr);
```

---

## 🛠️ Supported Chains

The SDK exports pre-configured objects:

- `BASE_MAINNET`, `BASE_SEPOLIA`
- `OPTIMISM_MAINNET`
- `ARBITRUM_MAINNET`
- `GNOSIS_MAINNET`
- `POLYGON_MAINNET`
- `AVALANCHE_MAINNET`
- `STELLAR_MAINNET`
- `UNICHAIN_SEPOLIA`
- `WORLD_CHAIN_MAINNET`

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
