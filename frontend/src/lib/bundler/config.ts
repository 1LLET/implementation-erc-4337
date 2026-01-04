import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import { DEPLOYMENTS } from "./deployments";

export interface Config {
    chainId: number;
    chain: Chain;
    rpcUrl: string;
    bundlerPrivateKey: `0x${string}`;
    entryPointAddress: `0x${string}`;
    factoryAddress: `0x${string}`;
    paymasterAddress: `0x${string}`;
    publicClient: PublicClient;
    walletClient: WalletClient;
}

// Cache clients to avoid creating too many instances
const clientCache: Record<string, { publicClient: PublicClient; walletClient: WalletClient }> = {};

export function getChainConfig(chainName: string): Config {
    // Normalize chain name
    const network = chainName.toLowerCase();

    // Resolve Chain object from viem or custom
    // We try to find it in viem/chains by name matches
    let chain: Chain | undefined = (chains as any)[network];

    // Fallback for some common names or if viem names differ
    if (!chain) {
        if (network === "basesepolia") chain = chains.baseSepolia;
        else if (network === "base") chain = chains.base;
        else if (network === "gnosis") chain = chains.gnosis;
        else throw new Error(`Chain '${network}' not found in viem/chains definitions.`);
    }

    // Get addresses from static deployments
    const deployment = DEPLOYMENTS[network];

    // NOTE: If no deployment found, we might need fallback addresses or throw
    const paymasterAddress = (deployment?.["SponsorPaymaster"] || "0x0000000000000000000000000000000000000000") as `0x${string}`;
    const entryPointAddress = (deployment?.["EntryPoint"] || "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789") as `0x${string}`;
    const factoryAddress = (deployment?.["SmartAccountFactory"] || process.env.FACTORY_ADDRESS || "0xe52553Fa5Cb212017b040c3678da2EC282963167") as `0x${string}`;

    // RPC URL: Try ENV first (e.g. ARBITRUM_RPC), then chain default
    const envKey = `${network.toUpperCase()}_RPC`;
    const rpcUrl = process.env[envKey] || chain.rpcUrls.default.http[0];

    const bundlerPrivateKey = process.env.BUNDLER_PRIVATE_KEY as `0x${string}`;
    if (!bundlerPrivateKey) {
        console.warn("BUNDLER_PRIVATE_KEY is missing in env!");
        // Fallback for build time type safety, but will fail runtime if accessed
    }

    // Get or create clients
    if (!clientCache[network]) {
        const account = privateKeyToAccount(bundlerPrivateKey || "0x0000000000000000000000000000000000000000000000000000000000000001");

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        }) as PublicClient;

        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl),
        }) as WalletClient;

        clientCache[network] = { publicClient, walletClient };
    }

    return {
        chainId: chain.id,
        chain,
        rpcUrl,
        bundlerPrivateKey,
        entryPointAddress,
        factoryAddress,
        paymasterAddress,
        publicClient: clientCache[network].publicClient,
        walletClient: clientCache[network].walletClient,
    };
}
