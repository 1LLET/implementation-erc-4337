import { type Address, type Hash } from "viem";
import { type Config } from "../config";
import { parseUserOp } from "../utils/userOpHash";
import { validateUserOp } from "../services/validator";
import { estimateUserOpGas } from "../services/gasEstimator";
import { executeUserOp, getUserOpReceipt, getUserOpByHash } from "../services/executor";
import { requestApprovalSupport } from "../services/approvalService";

export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: number | string;
    method: string;
    params: unknown[];
}

export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

/**
 * Handle eth_sendUserOperation
 * Validates and executes a UserOperation
 */
async function handleSendUserOperation(
    params: unknown[],
    config: Config
): Promise<Hash> {
    if (params.length < 2) {
        throw { code: -32602, message: "Invalid params: expected [userOp, entryPoint]" };
    }

    const rawUserOp = params[0] as Record<string, string>;
    const entryPoint = params[1] as Address;

    console.log("\n[eth_sendUserOperation]");
    console.log("EntryPoint:", entryPoint);
    console.log("Sender:", rawUserOp.sender);

    // Parse the UserOperation
    const userOp = parseUserOp(rawUserOp);

    // Validate
    const validation = await validateUserOp(userOp, entryPoint, config);
    if (!validation.valid) {
        console.log("Validation failed:", validation.error);
        throw { code: -32602, message: validation.error };
    }

    console.log("Validation passed, executing...");

    // Execute
    const userOpHash = await executeUserOp(userOp, config);
    return userOpHash;
}

/**
 * Handle eth_getUserOperationReceipt
 * Returns the receipt for a completed UserOperation
 */
async function handleGetUserOperationReceipt(
    params: unknown[]
): Promise<unknown> {
    if (params.length < 1) {
        throw { code: -32602, message: "Invalid params: expected [userOpHash]" };
    }

    const userOpHash = params[0] as Hash;
    console.log("\n[eth_getUserOperationReceipt]", userOpHash);

    const receipt = await getUserOpReceipt(userOpHash);
    if (!receipt) {
        return null;
    }

    return {
        userOpHash: receipt.userOpHash,
        sender: receipt.sender,
        nonce: "0x" + receipt.nonce.toString(16),
        success: receipt.success,
        actualGasCost: "0x" + receipt.actualGasCost.toString(16),
        actualGasUsed: "0x" + receipt.actualGasUsed.toString(16),
        receipt: {
            transactionHash: receipt.transactionHash,
            blockNumber: "0x" + receipt.blockNumber.toString(16),
            blockHash: receipt.blockHash,
        },
    };
}

/**
 * Handle eth_getUserOperationByHash
 * Returns info about a UserOperation
 */
async function handleGetUserOperationByHash(
    params: unknown[],
    config: Config
): Promise<unknown> {
    if (params.length < 1) {
        throw { code: -32602, message: "Invalid params: expected [userOpHash]" };
    }

    const userOpHash = params[0] as Hash;
    console.log("\n[eth_getUserOperationByHash]", userOpHash);

    const result = await getUserOpByHash(userOpHash);
    if (!result) {
        return null;
    }

    const { userOp, receipt } = result;

    // Need to safely handle partial userOp if it came from reception without data
    const safeUserOp = userOp as any || {};

    return {
        userOperation: {
            sender: safeUserOp.sender,
            nonce: safeUserOp.nonce ? "0x" + safeUserOp.nonce.toString(16) : undefined,
            initCode: safeUserOp.initCode,
            callData: safeUserOp.callData,
            callGasLimit: safeUserOp.callGasLimit ? "0x" + safeUserOp.callGasLimit.toString(16) : undefined,
            verificationGasLimit: safeUserOp.verificationGasLimit ? "0x" + safeUserOp.verificationGasLimit.toString(16) : undefined,
            preVerificationGas: safeUserOp.preVerificationGas ? "0x" + safeUserOp.preVerificationGas.toString(16) : undefined,
            maxFeePerGas: safeUserOp.maxFeePerGas ? "0x" + safeUserOp.maxFeePerGas.toString(16) : undefined,
            maxPriorityFeePerGas: safeUserOp.maxPriorityFeePerGas ? "0x" + safeUserOp.maxPriorityFeePerGas.toString(16) : undefined,
            paymasterAndData: safeUserOp.paymasterAndData,
            signature: safeUserOp.signature,
        },
        entryPoint: config.entryPointAddress,
        transactionHash: receipt?.transactionHash,
        blockNumber: receipt ? "0x" + receipt.blockNumber.toString(16) : null,
        blockHash: receipt?.blockHash,
    };
}

/**
 * Handle eth_supportedEntryPoints
 * Returns list of supported EntryPoints
 */
async function handleSupportedEntryPoints(config: Config): Promise<Address[]> {
    console.log("\n[eth_supportedEntryPoints]");
    return [config.entryPointAddress];
}

/**
 * Handle eth_estimateUserOperationGas
 * Estimates gas for a UserOperation
 */
async function handleEstimateUserOperationGas(
    params: unknown[],
    config: Config
): Promise<unknown> {
    if (params.length < 2) {
        throw { code: -32602, message: "Invalid params: expected [userOp, entryPoint]" };
    }

    const rawUserOp = params[0] as Record<string, string>;
    const entryPoint = params[1] as Address;

    console.log("\n[eth_estimateUserOperationGas]");
    console.log("EntryPoint:", entryPoint);
    console.log("Sender:", rawUserOp.sender);

    if (entryPoint.toLowerCase() !== config.entryPointAddress.toLowerCase()) {
        throw { code: -32602, message: `Invalid entryPoint. Expected ${config.entryPointAddress}` };
    }

    // Parse partial UserOp for estimation
    const partialUserOp = {
        sender: rawUserOp.sender as Address,
        nonce: rawUserOp.nonce ? BigInt(rawUserOp.nonce) : 0n,
        initCode: (rawUserOp.initCode || "0x") as `0x${string}`,
        callData: (rawUserOp.callData || "0x") as `0x${string}`,
        paymasterAndData: (rawUserOp.paymasterAndData || "0x") as `0x${string}`,
        signature: (rawUserOp.signature || "0x") as `0x${string}`,
    };

    const estimate = await estimateUserOpGas(partialUserOp, config);

    return {
        callGasLimit: "0x" + estimate.callGasLimit.toString(16),
        verificationGasLimit: "0x" + estimate.verificationGasLimit.toString(16),
        preVerificationGas: "0x" + estimate.preVerificationGas.toString(16),
        maxFeePerGas: "0x" + estimate.maxFeePerGas.toString(16),
        maxPriorityFeePerGas: "0x" + estimate.maxPriorityFeePerGas.toString(16),
    };
}

/**
 * Handle eth_chainId
 */
async function handleChainId(config: Config): Promise<string> {
    console.log("\n[eth_chainId]");
    return "0x" + config.chainId.toString(16);
}

/**
 * Handle pm_requestApprovalSupport
 */
async function handleRequestApprovalSupport(
    params: unknown[],
    config: Config
): Promise<unknown> {
    if (params.length < 4) {
        throw {
            code: -32602,
            message: "Invalid params: expected [token, owner, spender, amount]",
        };
    }

    const token = params[0] as Address;
    const owner = params[1] as Address;
    const spender = params[2] as Address;
    const amount = BigInt(params[3] as string); // Assume amount is passed as hex or string

    console.log("\n[pm_requestApprovalSupport]");
    console.log("Token:", token);
    console.log("Owner:", owner);

    const result = await requestApprovalSupport(token, owner, spender, amount, config);

    // Serialize BigInts
    return {
        ...result,
        gasCost: result.gasCost ? "0x" + result.gasCost.toString(16) : undefined,
        fundingNeeded: result.fundingNeeded ? "0x" + result.fundingNeeded.toString(16) : undefined,
    };
}

/**
 * Main RPC method dispatcher
 */
export async function handleRpcMethod(
    request: JsonRpcRequest,
    config: Config
): Promise<JsonRpcResponse> {
    const { id, method, params } = request;

    try {
        let result: unknown;

        switch (method) {
            case "eth_sendUserOperation":
                result = await handleSendUserOperation(params, config);
                break;
            case "eth_getUserOperationReceipt":
                result = await handleGetUserOperationReceipt(params);
                break;
            case "eth_getUserOperationByHash":
                result = await handleGetUserOperationByHash(params, config);
                break;
            case "eth_supportedEntryPoints":
                result = await handleSupportedEntryPoints(config);
                break;
            case "eth_estimateUserOperationGas":
                result = await handleEstimateUserOperationGas(params, config);
                break;
            case "eth_chainId":
                result = await handleChainId(config);
                break;
            case "pm_requestApprovalSupport":
                result = await handleRequestApprovalSupport(params, config);
                break;
            default:
                throw { code: -32601, message: `Method not found: ${method}` };
        }

        return { jsonrpc: "2.0", id, result };
    } catch (error: unknown) {
        const err = error as { code?: number; message?: string };
        console.error(`\n[ERROR] ${method}:`, err.message || error);

        return {
            jsonrpc: "2.0",
            id,
            error: {
                code: err.code || -32603,
                message: err.message || "Internal error",
                data: error instanceof Error ? error.message : undefined,
            },
        };
    }
}
