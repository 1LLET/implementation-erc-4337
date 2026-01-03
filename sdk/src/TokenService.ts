import { type Address, type PublicClient, encodeFunctionData } from "viem";
import { type ChainConfig, type Token } from "./types";
import { erc20Abi } from "./constants";

export class TokenService {
    private tokens: Map<string, Token> = new Map();
    private publicClient: PublicClient;

    constructor(chainConfig: ChainConfig, publicClient: PublicClient) {
        this.publicClient = publicClient;

        // Initialize Tokens
        chainConfig.tokens.forEach(token => {
            this.tokens.set(token.symbol.toUpperCase(), token);
        });
    }

    /**
     * Resolve token address from symbol or return address if provided
     */
    getTokenAddress(token: string | Address): Address {
        // Native Token (ETH)
        if (token === "ETH") {
            return "0x0000000000000000000000000000000000000000";
        }

        if (token.startsWith("0x")) return token as Address;
        const info = this.tokens.get(token.toUpperCase());
        if (!info) throw new Error(`Token ${token} not found in chain config`);
        return info.address;
    }

    /**
     * Get balance of a token for an account
     */
    async getBalance(token: string | Address, account: Address): Promise<bigint> {
        const address = this.getTokenAddress(token);

        // Native Balance
        if (address === "0x0000000000000000000000000000000000000000") {
            return await this.publicClient.getBalance({ address: account });
        }

        // ERC-20 Balance
        return await this.publicClient.readContract({
            address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [account],
        }) as bigint;
    }

    /**
     * Get allowance (ERC-20 only)
     */
    async getAllowance(token: string | Address, owner: Address, spender: Address): Promise<bigint> {
        const address = this.getTokenAddress(token);

        if (address === "0x0000000000000000000000000000000000000000") {
            return 0n; // Native token has no allowance
        }

        return await this.publicClient.readContract({
            address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [owner, spender],
        }) as bigint;
    }

    /**
     * Encode transfer data
     */
    encodeTransfer(recipient: Address, amount: bigint): `0x${string}` {
        return encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, amount]
        });
    }

    /**
     * Encode approve data
     */
    encodeApprove(spender: Address, amount: bigint): `0x${string}` {
        return encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, amount]
        });
    }
}
