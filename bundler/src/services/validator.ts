import { type Address, type Hex, isAddress, isHex } from "viem";
import { publicClient, config } from "../config.js";
import { type UserOperation } from "../utils/userOpHash.js";
import { entryPointAbi, paymasterAbi } from "../utils/abis.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a UserOperation before execution
 */
export async function validateUserOp(
  userOp: UserOperation,
  entryPoint: Address
): Promise<ValidationResult> {
  // 1. Validate entryPoint address
  if (entryPoint.toLowerCase() !== config.entryPointAddress.toLowerCase()) {
    return {
      valid: false,
      error: `Invalid entryPoint. Expected ${config.entryPointAddress}`,
    };
  }

  // 2. Validate sender address
  if (!isAddress(userOp.sender)) {
    return { valid: false, error: "Invalid sender address" };
  }

  // 3. Validate hex fields
  const hexFields: Array<[string, Hex]> = [
    ["initCode", userOp.initCode],
    ["callData", userOp.callData],
    ["paymasterAndData", userOp.paymasterAndData],
    ["signature", userOp.signature],
  ];

  for (const [name, value] of hexFields) {
    if (!isHex(value)) {
      return { valid: false, error: `Invalid ${name}: not valid hex` };
    }
  }

  // 4. Validate gas parameters
  if (userOp.callGasLimit <= 0n) {
    return { valid: false, error: "callGasLimit must be greater than 0" };
  }
  if (userOp.verificationGasLimit <= 0n) {
    return {
      valid: false,
      error: "verificationGasLimit must be greater than 0",
    };
  }
  if (userOp.preVerificationGas <= 0n) {
    return { valid: false, error: "preVerificationGas must be greater than 0" };
  }
  if (userOp.maxFeePerGas <= 0n) {
    return { valid: false, error: "maxFeePerGas must be greater than 0" };
  }

  // 5. Check if account needs to be deployed
  const senderCode = await publicClient.getCode({ address: userOp.sender });
  const isDeployed = senderCode && senderCode !== "0x";

  if (!isDeployed && userOp.initCode === "0x") {
    return {
      valid: false,
      error: "Account not deployed and no initCode provided",
    };
  }

  if (isDeployed && userOp.initCode !== "0x") {
    return {
      valid: false,
      error: "Account already deployed but initCode is not empty",
    };
  }

  // 6. Validate nonce
  const currentNonce = await publicClient.readContract({
    address: config.entryPointAddress,
    abi: entryPointAbi,
    functionName: "getNonce",
    args: [userOp.sender, 0n],
  });

  if (userOp.nonce !== currentNonce) {
    return {
      valid: false,
      error: `Invalid nonce. Expected ${currentNonce}, got ${userOp.nonce}`,
    };
  }

  // 7. Validate paymaster if present
  if (userOp.paymasterAndData !== "0x" && userOp.paymasterAndData.length >= 42) {
    const paymasterAddress = userOp.paymasterAndData.slice(0, 42) as Address;

    if (paymasterAddress.toLowerCase() !== config.paymasterAddress.toLowerCase()) {
      return {
        valid: false,
        error: `Invalid paymaster. Expected ${config.paymasterAddress}`,
      };
    }

    // Check paymaster deposit
    const paymasterDeposit = await publicClient.readContract({
      address: config.paymasterAddress,
      abi: paymasterAbi,
      functionName: "getDeposit",
    });

    const estimatedCost =
      (userOp.callGasLimit +
        userOp.verificationGasLimit +
        userOp.preVerificationGas) *
      userOp.maxFeePerGas;

    if (paymasterDeposit < estimatedCost) {
      return {
        valid: false,
        error: "Paymaster has insufficient deposit",
      };
    }
  }

  // 8. Validate signature is present
  if (userOp.signature === "0x" || userOp.signature.length < 130) {
    return { valid: false, error: "Signature is missing or too short" };
  }

  return { valid: true };
}
