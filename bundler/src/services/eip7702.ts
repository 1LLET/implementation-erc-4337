import { type Address, type Hex, keccak256, toRlp, numberToHex, concat } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "../config.js";

export interface UnsignedAuthorization {
  contractAddress: Address;
  chainId: number;
  nonce?: number; // If not provided, will fetch from chain
}

export interface SignedAuthorization {
  contractAddress: Address;
  chainId: number;
  nonce: number;
  r: Hex;
  s: Hex;
  v: number;
  yParity: number;
}

/**
 * Sign an EIP-7702 authorization using a private key
 *
 * EIP-7702 authorization format:
 * sign(keccak256(0x05 || rlp([chain_id, address, nonce])))
 */
export async function signEip7702Authorization(
  auth: UnsignedAuthorization,
  privateKey: Hex
): Promise<SignedAuthorization> {
  const account = privateKeyToAccount(privateKey);

  // Get the nonce if not provided
  let nonce = auth.nonce;
  if (nonce === undefined) {
    nonce = await publicClient.getTransactionCount({
      address: account.address,
    });
  }

  console.log(`Signing EIP-7702 authorization for ${account.address}`);
  console.log(`  Contract: ${auth.contractAddress}`);
  console.log(`  ChainId: ${auth.chainId}`);
  console.log(`  Nonce: ${nonce}`);

  // Build the authorization tuple for RLP encoding
  const chainIdHex = auth.chainId === 0 ? "0x" : numberToHex(auth.chainId);
  const nonceHex = nonce === 0 ? "0x" : numberToHex(nonce);

  // RLP encode: [chain_id, address, nonce]
  const rlpEncoded = toRlp([chainIdHex, auth.contractAddress, nonceHex]);

  // Prepend the EIP-7702 magic byte (0x05) and hash
  const MAGIC = "0x05" as Hex;
  const message = concat([MAGIC, rlpEncoded]);
  const authorizationHash = keccak256(message);

  console.log(`  Authorization hash: ${authorizationHash}`);

  // Sign the hash directly (raw signature without any prefix)
  const signature = await account.sign({
    hash: authorizationHash,
  });

  console.log(`  Signature: ${signature}`);

  // Parse signature into r, s, v components
  const r = `0x${signature.slice(2, 66)}` as Hex;
  const s = `0x${signature.slice(66, 130)}` as Hex;
  let v = parseInt(signature.slice(130, 132), 16);

  // Normalize v value
  if (v < 27) {
    v += 27;
  }
  const yParity = v - 27;

  const signedAuth: SignedAuthorization = {
    contractAddress: auth.contractAddress,
    chainId: auth.chainId,
    nonce,
    r,
    s,
    v,
    yParity,
  };

  console.log(`  Signed authorization:`, signedAuth);
  return signedAuth;
}

/**
 * Verify that a private key corresponds to the expected address
 */
export function verifyPrivateKey(privateKey: Hex, expectedAddress: Address): boolean {
  try {
    const account = privateKeyToAccount(privateKey);
    return account.address.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
