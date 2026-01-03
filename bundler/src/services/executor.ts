import { type Hash, type Address, decodeEventLog } from "viem";
import { type Config } from "../config.js";
import { type UserOperation, userOpToTuple, getUserOpHash } from "../utils/userOpHash.js";
import { entryPointAbi } from "../utils/abis.js";

export interface UserOpReceipt {
  userOpHash: Hash;
  sender: Address;
  nonce: bigint;
  success: boolean;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  transactionHash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
}

// In-memory storage for receipts (in production, use a database)
const receipts = new Map<Hash, UserOpReceipt>();
const pendingOps = new Map<Hash, UserOperation>();

/**
 * Execute a UserOperation by sending it to the EntryPoint
 */
export async function executeUserOp(userOp: UserOperation, config: Config): Promise<Hash> {
  const userOpHash = getUserOpHash(userOp, config.entryPointAddress, config.chainId);

  console.log("\n=== Executing UserOperation ===");
  console.log("UserOpHash:", userOpHash);
  console.log("Sender:", userOp.sender);
  console.log("Nonce:", userOp.nonce.toString());
  console.log("Has initCode:", userOp.initCode !== "0x");
  console.log("Has paymaster:", userOp.paymasterAndData !== "0x");

  // Store pending operation
  pendingOps.set(userOpHash, userOp);

  try {
    // Simulate the handleOps call first
    console.log("\nSimulating handleOps...");
    await config.publicClient.simulateContract({
      address: config.entryPointAddress,
      abi: entryPointAbi,
      functionName: "handleOps",
      args: [[userOpToTuple(userOp)], config.walletClient.account!.address],
      account: config.walletClient.account!,
    });
    console.log("Simulation successful!");

    // Execute the transaction
    console.log("\nSending transaction to EntryPoint...");
    const txHash = await config.walletClient.writeContract({
      address: config.entryPointAddress,
      abi: entryPointAbi,
      functionName: "handleOps",
      args: [[userOpToTuple(userOp)], config.walletClient.account!.address],
      chain: config.chain, // Explicitly pass chain to avoid mismatch
      account: config.walletClient.account!,
    });

    console.log("Transaction hash:", txHash);

    // Wait for the transaction to be mined
    console.log("Waiting for confirmation...");
    const receipt = await config.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Parse the UserOperationEvent from logs
    let success = false;
    let actualGasCost = 0n;
    let actualGasUsed = 0n;

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: entryPointAbi,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "UserOperationEvent") {
          const args = decoded.args as {
            userOpHash: Hash;
            success: boolean;
            actualGasCost: bigint;
            actualGasUsed: bigint;
          };
          if (args.userOpHash === userOpHash) {
            success = args.success;
            actualGasCost = args.actualGasCost;
            actualGasUsed = args.actualGasUsed;
            console.log("\nUserOperation result:");
            console.log("  Success:", success);
            console.log("  Gas cost:", actualGasCost.toString(), "wei");
            console.log("  Gas used:", actualGasUsed.toString());
            break;
          }
        }

        if (decoded.eventName === "UserOperationRevertReason") {
          const args = decoded.args as {
            userOpHash: Hash;
            revertReason: `0x${string}`;
          };
          if (args.userOpHash === userOpHash) {
            console.log("\nUserOperation reverted!");
            console.log("  Reason:", args.revertReason);
          }
        }
      } catch {
        // Not a known event, skip
      }
    }

    // Store receipt
    const userOpReceipt: UserOpReceipt = {
      userOpHash,
      sender: userOp.sender,
      nonce: userOp.nonce,
      success,
      actualGasCost,
      actualGasUsed,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
    };

    receipts.set(userOpHash, userOpReceipt);
    pendingOps.delete(userOpHash);

    console.log("=== Execution Complete ===\n");
    return userOpHash;
  } catch (error) {
    pendingOps.delete(userOpHash);
    console.error("\n=== Execution Failed ===");
    console.error("Error:", error);
    throw error;
  }
}

/**
 * Get the receipt for a UserOperation
 */
export function getUserOpReceipt(userOpHash: Hash): UserOpReceipt | null {
  return receipts.get(userOpHash) || null;
}

/**
 * Get a pending or executed UserOperation
 */
export function getUserOpByHash(
  userOpHash: Hash
): { userOp: UserOperation; receipt?: UserOpReceipt } | null {
  const receipt = receipts.get(userOpHash);
  if (receipt) {
    // Find the original userOp (we might need to store it too)
    return { userOp: pendingOps.get(userOpHash)!, receipt };
  }

  const pending = pendingOps.get(userOpHash);
  if (pending) {
    return { userOp: pending };
  }

  return null;
}
