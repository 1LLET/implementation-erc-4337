import { type Address, type Hex, keccak256, toRlp, numberToHex, concat, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface UnsignedAuthorization {
    contractAddress: Address;
    chainId: number;
    nonce?: number;
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
 */
export async function signEip7702Authorization(
    auth: UnsignedAuthorization,
    privateKey: Hex,
    publicClient: PublicClient
): Promise<SignedAuthorization> {
    const account = privateKeyToAccount(privateKey);

    // Get the nonce if not provided
    let nonce = auth.nonce;
    if (nonce === undefined) {
        const count = await publicClient.getTransactionCount({
            address: account.address,
        });
        nonce = Number(count);
    }

    console.log(`Signing EIP-7702 authorization for ${account.address}`);
    console.log(`  Contract: ${auth.contractAddress}`);

    // Build the authorization tuple for RLP encoding
    const chainIdHex = auth.chainId === 0 ? "0x" : numberToHex(auth.chainId);
    const nonceHex = nonce === 0 ? "0x" : numberToHex(nonce);

    // RLP encode: [chain_id, address, nonce]
    const rlpEncoded = toRlp([chainIdHex, auth.contractAddress, nonceHex]);

    // Prepend the EIP-7702 magic byte (0x05) and hash
    const MAGIC = "0x05" as Hex;
    const message = concat([MAGIC, rlpEncoded]);
    const authorizationHash = keccak256(message);

    // Sign the hash directly (raw signature without any prefix)
    const signature = await account.sign({
        hash: authorizationHash,
    });

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

    return signedAuth;
}
