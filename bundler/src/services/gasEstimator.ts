import { type Address, encodeFunctionData, parseGwei } from "viem";
import { publicClient, config } from "../config.js";
import { type UserOperation } from "../utils/userOpHash.js";
import { entryPointAbi, factoryAbi, smartAccountAbi } from "../utils/abis.js";

export interface GasEstimate {
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/**
 * Estimate gas for a UserOperation
 */
export async function estimateUserOpGas(
  userOp: Partial<UserOperation>
): Promise<GasEstimate> {
  // Get current gas prices
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = feeData.maxFeePerGas || parseGwei("1");
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || parseGwei("0.1");

  // Base verification gas (includes signature validation)
  let verificationGasLimit = 150000n;

  // Add extra gas if deploying the account
  if (userOp.initCode && userOp.initCode !== "0x") {
    verificationGasLimit += 200000n;
  }

  // Add extra gas if using paymaster
  if (userOp.paymasterAndData && userOp.paymasterAndData !== "0x") {
    verificationGasLimit += 50000n;
  }

  // Estimate call gas
  let callGasLimit = 100000n;

  if (userOp.callData && userOp.callData !== "0x" && userOp.sender) {
    try {
      // Try to estimate the actual execution gas
      const estimatedGas = await publicClient.estimateGas({
        to: userOp.sender,
        data: userOp.callData,
        account: config.entryPointAddress,
      });
      callGasLimit = (estimatedGas * 130n) / 100n; // Add 30% buffer
    } catch {
      // Use default if estimation fails (account might not be deployed)
      callGasLimit = 200000n;
    }
  }

  // PreVerification gas (covers calldata cost + overhead)
  const preVerificationGas = calculatePreVerificationGas(userOp);

  return {
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

/**
 * Calculate preVerificationGas (calldata cost + bundler overhead)
 */
function calculatePreVerificationGas(userOp: Partial<UserOperation>): bigint {
  // Base overhead
  let gas = 21000n;

  // Count non-zero bytes in UserOp fields (each costs 16 gas)
  // Count zero bytes (each costs 4 gas)
  const fields = [
    userOp.initCode || "0x",
    userOp.callData || "0x",
    userOp.paymasterAndData || "0x",
    userOp.signature || "0x",
  ];

  for (const field of fields) {
    const bytes = field.slice(2); // Remove 0x prefix
    for (let i = 0; i < bytes.length; i += 2) {
      const byte = parseInt(bytes.slice(i, i + 2), 16);
      if (byte === 0) {
        gas += 4n;
      } else {
        gas += 16n;
      }
    }
  }

  // Add fixed overhead for the UserOp struct
  gas += 5000n;

  return gas;
}

/**
 * Build initCode for deploying a new account
 */
export function buildInitCode(owner: Address, salt: bigint = 0n): `0x${string}` {
  const createAccountData = encodeFunctionData({
    abi: factoryAbi,
    functionName: "createAccount",
    args: [owner, salt],
  });

  // initCode = factory address + calldata for createAccount
  return `${config.factoryAddress}${createAccountData.slice(2)}` as `0x${string}`;
}

/**
 * Build callData for a simple ETH transfer
 */
export function buildTransferCallData(
  to: Address,
  value: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: smartAccountAbi,
    functionName: "execute",
    args: [to, value, "0x"],
  });
}

/**
 * Get the nonce for an account from EntryPoint
 */
export async function getNonce(sender: Address): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: config.entryPointAddress,
      abi: entryPointAbi,
      functionName: "getNonce",
      args: [sender, 0n],
    });
  } catch {
    return 0n;
  }
}
