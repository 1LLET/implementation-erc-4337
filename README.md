# ERC-4337 Gasless Transfers (Self-Hosted)

A complete Account Abstraction (ERC-4337) implementation with self-hosted infrastructure. No external services like Pimlico, Stackup, Alchemy, or Biconomy - everything runs locally.

## Architecture

```
User (EOA/MetaMask)
│
▼ controla
Smart Account (Contrato)
│
▼ UserOperation firmada
│
┌───┴───────────────────────────────────────────┐
│                                               │
│   Backend (Bundler propio)                    │
│   - Recibe UserOperations via JSON-RPC        │
│   - Simula y valida                           │
│   - Envía tx al EntryPoint                    │
│   - Wallet propia que paga gas                │
│                                               │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
        EntryPoint (0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789)
                    │
                    ▼
        Paymaster (on-chain, tu lo deployeas)
                    │
                    ▼
        Blockchain (Base Sepolia)
```

## Project Structure

```
erc4337-gasless/
├── contracts/                    # Hardhat + Solidity
│   ├── contracts/
│   │   ├── SimpleSmartAccount.sol
│   │   ├── SmartAccountFactory.sol
│   │   └── SponsorPaymaster.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── hardhat.config.ts
│   └── package.json
│
├── bundler/                      # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── rpc/
│   │   │   ├── handler.ts
│   │   │   └── methods.ts
│   │   ├── services/
│   │   │   ├── validator.ts
│   │   │   ├── executor.ts
│   │   │   └── gasEstimator.ts
│   │   └── utils/
│   │       ├── userOpHash.ts
│   │       └── abis.ts
│   └── package.json
│
├── frontend/                     # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   └── GaslessTransfer.tsx
│   │   ├── lib/
│   │   │   └── accountAbstraction.ts
│   │   └── config/
│   │       └── contracts.ts
│   └── package.json
│
└── README.md
```

## Prerequisites

1. **Node.js** v18 or later
2. **Two wallets** with ETH on Base Sepolia:
   - **Deployer wallet**: For deploying contracts
   - **Bundler wallet**: For paying transaction gas
3. **Base Sepolia ETH**: Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
4. **BaseScan API Key** (optional): For contract verification

## Quick Start

### 1. Deploy Contracts

```bash
cd contracts
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and BASESCAN_API_KEY

# Compile and deploy
npm run compile
npm run deploy
```

Save the output addresses:
- `FACTORY_ADDRESS`
- `PAYMASTER_ADDRESS`

### 2. Start Bundler

```bash
cd bundler
npm install

# Configure environment
cp .env.example .env
# Edit .env with:
#   - BUNDLER_PRIVATE_KEY (different wallet!)
#   - FACTORY_ADDRESS (from step 1)
#   - PAYMASTER_ADDRESS (from step 1)

# Start bundler
npm run dev
```

The bundler runs at `http://localhost:3001`

### 3. Start Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with:
#   - NEXT_PUBLIC_FACTORY_ADDRESS (from step 1)
#   - NEXT_PUBLIC_PAYMASTER_ADDRESS (from step 1)

# Start frontend
npm run dev
```

The frontend runs at `http://localhost:3000`

## Configuration Details

### Contracts (.env)

```env
# Deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_deployer_private_key

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC=https://sepolia.base.org

# BaseScan API Key for contract verification
BASESCAN_API_KEY=your_basescan_api_key
```

### Bundler (.env)

```env
# Server port
PORT=3001

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Bundler wallet private key (this wallet pays gas!)
BUNDLER_PRIVATE_KEY=0xyour_bundler_private_key

# Contract addresses
ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
FACTORY_ADDRESS=0x_from_deploy_output
PAYMASTER_ADDRESS=0x_from_deploy_output
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_BUNDLER_URL=http://localhost:3001/rpc
NEXT_PUBLIC_FACTORY_ADDRESS=0x_from_deploy_output
NEXT_PUBLIC_PAYMASTER_ADDRESS=0x_from_deploy_output
NEXT_PUBLIC_ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

## Funding the Paymaster

The Paymaster needs ETH deposited in the EntryPoint to sponsor gas. The deploy script automatically deposits 0.1 ETH.

To add more funds:

```javascript
// Using Hardhat console or script
const paymaster = await ethers.getContractAt("SponsorPaymaster", PAYMASTER_ADDRESS);
await paymaster.deposit({ value: ethers.parseEther("0.5") });
```

## Whitelisting Smart Accounts

Users' Smart Accounts must be whitelisted in the Paymaster:

```javascript
// Single account
await paymaster.setWhitelisted("0xSmartAccountAddress", true);

// Multiple accounts
await paymaster.setWhitelistedBatch(
  ["0xAccount1", "0xAccount2", "0xAccount3"],
  true
);
```

**Tip**: You can get the Smart Account address from the frontend before whitelisting. The address is deterministic (counterfactual).

## Testing Flow

1. **Deploy contracts** and note the addresses
2. **Fund the bundler wallet** with ~0.1 ETH on Base Sepolia
3. **Start the bundler** (`npm run dev` in bundler folder)
4. **Start the frontend** (`npm run dev` in frontend folder)
5. **Connect MetaMask** in the dApp
6. **Copy the Smart Account address** shown in the UI
7. **Whitelist the Smart Account** in the Paymaster contract
8. **Send ETH to the Smart Account** (the address shown in the UI)
9. **Enter a recipient and amount** in the dApp
10. **Click "Send (Gasless)"**
11. **Sign the message** in MetaMask (no gas fee!)
12. **Wait for confirmation** and check BaseScan

## JSON-RPC Methods

The bundler implements these ERC-4337 methods:

| Method | Description |
|--------|-------------|
| `eth_sendUserOperation` | Submit a UserOperation |
| `eth_getUserOperationReceipt` | Get receipt for a UserOperation |
| `eth_getUserOperationByHash` | Get UserOperation details |
| `eth_supportedEntryPoints` | List supported EntryPoints |
| `eth_estimateUserOperationGas` | Estimate gas for a UserOperation |
| `eth_chainId` | Get the chain ID |

## Contract Verification

After deploying, verify contracts on BaseScan:

```bash
cd contracts

# Verify Factory
npx hardhat verify --network baseSepolia FACTORY_ADDRESS "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"

# Verify Paymaster
npx hardhat verify --network baseSepolia PAYMASTER_ADDRESS "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" "10000000000000000"
```

## Troubleshooting

### "Account not whitelisted"
The Smart Account needs to be whitelisted in the Paymaster. Use `setWhitelisted()`.

### "Paymaster has insufficient deposit"
Fund the Paymaster using `deposit()` or by sending ETH directly to the Paymaster contract.

### "Invalid nonce"
The nonce is out of sync. Refresh the page and try again.

### "Bundler wallet balance is low"
The bundler wallet needs ETH to pay for gas. Fund it on Base Sepolia.

### "Account not deployed and no initCode"
This shouldn't happen with the current implementation. The frontend automatically includes initCode for new accounts.

### MetaMask shows wrong network
Switch to Base Sepolia (Chain ID: 84532). The frontend will prompt to switch automatically.

### Transaction reverted
Check the bundler console logs for detailed error messages. Common causes:
- Insufficient balance in Smart Account
- Paymaster daily limit exceeded
- Invalid signature

## Technical Details

### Smart Contracts

- **SimpleSmartAccount**: ERC-4337 compliant account with ECDSA signature validation
- **SmartAccountFactory**: CREATE2 factory using OpenZeppelin Clones
- **SponsorPaymaster**: Paymaster with whitelist and daily limits

### Security Considerations

1. **Bundler wallet**: Keep the private key secure. It has permission to submit transactions.
2. **Paymaster funding**: Monitor the deposit balance to ensure continued sponsorship.
3. **Whitelist management**: Only whitelist trusted accounts.
4. **Daily limits**: Adjust `dailyLimit` based on expected usage.

## Tech Stack

- **Contracts**: Hardhat, Solidity 0.8.19, @account-abstraction/contracts v0.6.0, OpenZeppelin v5
- **Bundler**: Node.js, Express, TypeScript, viem
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, viem

## License

MIT
