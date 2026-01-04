import { type Hash, type Address, decodeEventLog } from "viem";
import { type Config } from "../config";
import { type UserOperation, userOpToTuple, getUserOpHash } from "../utils/userOpHash";
import { entryPointAbi } from "../utils/abis";
import { UserOpReceiptModel } from "../models/UserOpReceipt";
import { PendingUserOpModel } from "../models/PendingUserOp";

// Re-export receipt interface for consumers
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

/**
 * Execute a UserOperation by sending it to the EntryPoint
 */
export async function executeUserOp(userOp: UserOperation, config: Config): Promise<Hash> {
    const userOpHash = getUserOpHash(userOp, config.entryPointAddress, config.chainId);

    console.log("\n=== Executing UserOperation ===");
    console.log("UserOpHash:", userOpHash);
    console.log("Sender:", userOp.sender);

    // 1. Save as Pending
    await PendingUserOpModel.create({
        userOpHash,
        sender: userOp.sender,
        userOpData: userOp,
        status: "pending"
    });

    try {
        // Simulate
        console.log("\nSimulating handleOps...");
        await config.publicClient.simulateContract({
            address: config.entryPointAddress,
            abi: entryPointAbi,
            functionName: "handleOps",
            args: [[userOpToTuple(userOp)], config.walletClient.account!.address],
            account: config.walletClient.account!,
        });
        console.log("Simulation successful!");

        // Execute
        console.log("\nSending transaction to EntryPoint...");
        const txHash = await config.walletClient.writeContract({
            address: config.entryPointAddress,
            abi: entryPointAbi,
            functionName: "handleOps",
            args: [[userOpToTuple(userOp)], config.walletClient.account!.address],
            chain: config.chain,
            account: config.walletClient.account!,
        });

        console.log("Transaction hash:", txHash);

        // Update Pending status
        await PendingUserOpModel.updateOne({ userOpHash }, { status: "submitted", transactionHash: txHash });

        console.log("Waiting for confirmation...");
        // Long timeout for slow chains
        const receipt = await config.publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Parse logs
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
                    const args = decoded.args as any;
                    if (args.userOpHash === userOpHash) {
                        success = args.success;
                        actualGasCost = args.actualGasCost;
                        actualGasUsed = args.actualGasUsed;
                        break;
                    }
                }
            } catch { /* ignore */ }
        }

        console.log("\nUserOperation result:", success ? "SUCCESS" : "FAILED");

        // 2. Save Receipt to DB
        await UserOpReceiptModel.create({
            userOpHash,
            sender: userOp.sender,
            nonce: userOp.nonce.toString(),
            success,
            actualGasCost: actualGasCost.toString(),
            actualGasUsed: actualGasUsed.toString(),
            transactionHash: txHash,
            blockNumber: receipt.blockNumber.toString(),
            blockHash: receipt.blockHash,
        });

        // Mark as completed instead of deleting, for history
        await PendingUserOpModel.updateOne({ userOpHash }, { status: "completed" }); // Or delete if you prefer cleanup

        console.log("=== Execution Complete ===\n");
        return userOpHash;

    } catch (error) {
        console.error("\n=== Execution Failed ===", error);
        await PendingUserOpModel.updateOne({ userOpHash }, { status: "failed", error: String(error) });
        throw error;
    }
}

/**
 * Get the receipt for a UserOperation
 */
export async function getUserOpReceipt(userOpHash: Hash): Promise<UserOpReceipt | null> {
    const doc = await UserOpReceiptModel.findOne({ userOpHash });
    if (!doc) return null;

    return {
        userOpHash: doc.userOpHash as Hash,
        sender: doc.sender as Address,
        nonce: BigInt(doc.nonce),
        success: doc.success,
        actualGasCost: BigInt(doc.actualGasCost),
        actualGasUsed: BigInt(doc.actualGasUsed),
        transactionHash: doc.transactionHash as Hash,
        blockNumber: BigInt(doc.blockNumber),
        blockHash: doc.blockHash as Hash
    };
}

/**
 * Get a pending or executed UserOperation
 */
export async function getUserOpByHash(
    userOpHash: Hash
): Promise<{ userOp: UserOperation; receipt?: UserOpReceipt } | null> {
    // Check receipt first
    const receipt = await getUserOpReceipt(userOpHash);
    if (receipt) {
        // Try to find original OP in pending log
        const pending = await PendingUserOpModel.findOne({ userOpHash });
        if (pending) {
            return { userOp: pending.userOpData, receipt };
        }
        return { userOp: {} as any, receipt }; // Partial data
    }

    // Check pending
    const pending = await PendingUserOpModel.findOne({ userOpHash });
    if (pending) {
        return { userOp: pending.userOpData };
    }

    return null;
}
