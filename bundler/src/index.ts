import express from "express";
import cors from "cors";
import { config, bundlerAccount, publicClient } from "./config.js";
import { rpcRouter } from "./rpc/handler.js";
import { formatEther } from "viem";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// RPC endpoint
app.use("/rpc", rpcRouter);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "ERC-4337 Self-Hosted Bundler",
    version: "1.0.0",
    chainId: config.chainId,
    entryPoint: config.entryPointAddress,
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
  console.log("\n====================================");
  console.log("ERC-4337 Self-Hosted Bundler");
  console.log("====================================\n");

  // Check bundler balance
  const balance = await publicClient.getBalance({
    address: bundlerAccount.address,
  });

  console.log("Configuration:");
  console.log("  Chain ID:", config.chainId);
  console.log("  RPC URL:", config.rpcUrl);
  console.log("  EntryPoint:", config.entryPointAddress);
  console.log("  Factory:", config.factoryAddress);
  console.log("  Paymaster:", config.paymasterAddress);
  console.log("\nBundler Wallet:");
  console.log("  Address:", bundlerAccount.address);
  console.log("  Balance:", formatEther(balance), "ETH");

  if (balance < BigInt(1e16)) {
    console.warn("\n⚠️  WARNING: Bundler wallet balance is low!");
    console.warn("   The bundler needs ETH to pay for transaction gas.");
    console.warn("   Please fund:", bundlerAccount.address);
  }

  app.listen(config.port, () => {
    console.log(`\n🚀 Bundler running at http://localhost:${config.port}`);
    console.log(`   RPC endpoint: http://localhost:${config.port}/rpc`);
    console.log("\n====================================\n");
  });
}

start().catch(console.error);
