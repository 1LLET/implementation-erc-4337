import express from "express";
import cors from "cors";
import { getChainConfig, type Config } from "./config.js";
import { rpcRouter } from "./rpc/handler.js";
import { formatEther } from "viem";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// RPC endpoint
app.use("/rpc", rpcRouter);

// Root endpoint
app.get("/", (req, res) => {
  // Allow querying specific chain info via ?chain=xxx
  const chainName = (req.query.chain as string) || "baseSepolia";
  let config: Config | null = null;

  try {
    config = getChainConfig(chainName);
  } catch (e) {
    // If default chain fails, just returning generic info is fine or error
  }

  res.json({
    name: "ERC-4337 Self-Hosted Bundler",
    version: "1.0.0",
    chain: config ? config.chain.name : "Dynamic",
    chainId: config ? config.chainId : undefined,
    entryPoint: config ? config.entryPointAddress : undefined,
    endpoints: {
      rpc: "/rpc",
      health: "/rpc/health",
    },
    supportedMethods: [
      "eth_sendUserOperation",
      "eth_getUserOperationReceipt",
      "eth_getUserOperationByHash",
      "eth_supportedEntryPoints",
      "eth_estimateUserOperationGas",
      "eth_chainId",
    ],
  });
});

// Start server
async function start() {
  const PORT = process.env.PORT || 3000;

  console.log("\n====================================");
  console.log("ERC-4337 Self-Hosted Bundler");
  console.log("====================================\n");

  // Try to load a default chain to show some info, but don't crash if missing
  try {
    const defaultChain = "baseSepolia";
    const config = getChainConfig(defaultChain);

    // Check bundler balance for default chain
    const address = config.walletClient.account?.address;

    if (!address) {
      console.warn("Could not derive bundler address for balance check");
    } else {
      const balanceVal = await config.publicClient.getBalance({
        address,
      });

      console.log(`Default Chain (${defaultChain}) Configuration:`);
      console.log("  Chain ID:", config.chainId);
      console.log("  RPC URL:", config.rpcUrl);
      console.log("  EntryPoint:", config.entryPointAddress);
      console.log("  Factory:", config.factoryAddress);
      console.log("  Paymaster:", config.paymasterAddress);
      console.log("\nBundler Wallet:");
      console.log("  Address:", address);
      console.log("  Balance:", formatEther(balanceVal), "ETH");

      if (balanceVal < BigInt(1e16)) {
        console.warn("\n⚠️  WARNING: Bundler wallet balance is low on default chain!");
      }
    }
  } catch (e) {
    console.log("Could not load default chain 'baseSepolia' configuration for startup log. Ignoring.");
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Bundler running at http://localhost:${PORT}`);
    console.log(`   RPC endpoint: http://localhost:${PORT}/rpc`);
    console.log("\n====================================\n");
  });
}

start().catch(console.error);
