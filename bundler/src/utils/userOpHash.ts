import {
  encodeAbiParameters,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { config } from "../config.js";

export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

/**
 * Pack a UserOperation for hashing (without signature)
 */
export function packUserOp(userOp: UserOperation): Hex {
  return encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
    ],
    [
      userOp.sender,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      keccak256(userOp.paymasterAndData),
    ]
  );
}

/**
 * Calculate the UserOperation hash according to ERC-4337 spec
 */
export function getUserOpHash(userOp: UserOperation): Hex {
  const packed = packUserOp(userOp);
  const packedHash = keccak256(packed);

  // Hash with entryPoint address and chainId
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
      [packedHash, config.entryPointAddress, BigInt(config.chainId)]
    )
  );
}

/**
 * Parse UserOperation from JSON-RPC request
 */
export function parseUserOp(rawUserOp: Record<string, string>): UserOperation {
  return {
    sender: rawUserOp.sender as Address,
    nonce: BigInt(rawUserOp.nonce),
    initCode: (rawUserOp.initCode || "0x") as Hex,
    callData: rawUserOp.callData as Hex,
    callGasLimit: BigInt(rawUserOp.callGasLimit),
    verificationGasLimit: BigInt(rawUserOp.verificationGasLimit),
    preVerificationGas: BigInt(rawUserOp.preVerificationGas),
    maxFeePerGas: BigInt(rawUserOp.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(rawUserOp.maxPriorityFeePerGas),
    paymasterAndData: (rawUserOp.paymasterAndData || "0x") as Hex,
    signature: (rawUserOp.signature || "0x") as Hex,
  };
}

/**
 * Convert UserOperation to format expected by contract
 */
export function userOpToTuple(userOp: UserOperation) {
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: userOp.callGasLimit,
    verificationGasLimit: userOp.verificationGasLimit,
    preVerificationGas: userOp.preVerificationGas,
    maxFeePerGas: userOp.maxFeePerGas,
    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };
}
