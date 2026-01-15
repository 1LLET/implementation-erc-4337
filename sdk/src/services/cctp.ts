import {
    createPublicClient,
    createWalletClient,
    http,
    parseSignature,
    padHex,
    maxUint256,
    Address
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    FacilitatorChainKey,
    calculateFee
} from "@/constants/facilitator";
import { FACILITATOR_NETWORKS } from "@/constants/facilitator";
import { usdcErc3009Abi } from "@/constants/abis";
import { tokenMessengerAbi, messageTransmitterAbi } from "@/constants/abis";
import { SettleResponse, FacilitatorPaymentPayload, CrossChainConfig } from "@/services/types";
import { createRetrieveAttestation } from "@/utils/cctp";
import { BridgeStrategy, BridgeContext } from "./types";
import { NETWORKS } from "@/constants/chainsInformation";
import { ChainKey } from "@/types/chain";



/** Converts an address to bytes32 format for CCTP mintRecipient */
const addressToBytes32 = (address: Address): `0x${string}` => {
    return padHex(address, { size: 32 });
};

export class CCTPStrategy implements BridgeStrategy {
    name = "CCTP";

    canHandle(context: BridgeContext): boolean {
        const { sourceChain, destChain, sourceToken, destToken } = context;
        const sourceConfig = NETWORKS[sourceChain];
        const destConfig = NETWORKS[destChain];

        if (!sourceConfig || !destConfig) return false;

        const sourceCCTP = sourceConfig.crossChainInformation?.circleInformation?.cCTPInformation?.supportCCTP;
        const destCCTP = destConfig.crossChainInformation?.circleInformation?.cCTPInformation?.supportCCTP;

        // Default to USDC if destToken is missing (backward compatibility) 
        let targetToken = destToken;
        if (!targetToken) {
            if (sourceToken && sourceToken !== "USDC") {
                targetToken = sourceToken;
            } else {
                targetToken = "USDC";
            }
        }

        return !!(sourceCCTP && destCCTP && targetToken === "USDC" && (sourceToken === "USDC" || !sourceToken));
    }

    async execute(context: BridgeContext): Promise<SettleResponse> {
        const { paymentPayload, sourceChain, destChain, amount, recipient } = context;

        const destConfig = NETWORKS[destChain];
        const destinationDomain = destConfig.crossChainInformation?.circleInformation?.cCTPInformation?.domain;

        if (destinationDomain === undefined) {
            return {
                success: false,
                errorReason: "Destination chain does not have CCTP domain configured"
            };
        }

        const crossChainConfig: CrossChainConfig = {
            destinationChain: destChain as FacilitatorChainKey,
            destinationDomain: destinationDomain,
            mintRecipient: recipient as Address
        };

        return processCCTPSettlement(
            context,
            crossChainConfig
        );
    }
}

export async function processCCTPSettlement(
    context: BridgeContext,
    crossChainConfig: CrossChainConfig
): Promise<SettleResponse> {
    const { paymentPayload, sourceChain, amount, recipient, facilitatorPrivateKey, depositTxHash } = context;

    console.log(`[SDK v0.4.22] Processing CCTP. DepositHash: ${depositTxHash} (${typeof depositTxHash})`);

    if (!facilitatorPrivateKey) {
        return {
            success: false,
            errorReason: "Facilitator Private Key not provided in context"
        };
    }

    const networkConfig = FACILITATOR_NETWORKS[sourceChain];
    if (!networkConfig) {
        return {
            success: false,
            errorReason: `Unsupported chain: ${sourceChain}`
        };
    }

    // Step 1: Check Facilitator Balance or Verify Deposit (Push Model)
    const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey as `0x${string}`);

    const fromAddress = context.senderAddress || (paymentPayload?.authorization?.from);

    if (!fromAddress) {
        return { success: false, errorReason: "Sender address is missing" };
    }

    const usdcAddress = networkConfig.usdc;
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC 6 decimals

    const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl)
    });

    // ... (rest of logic) ...

    // Step 4: Execute CCTP on Source Chain
    // If depositTxHash is verified, we proceed to fetch attestation.

    // Replacing the execute call argument:
    // return executeCCTPBridge(..., fromAddress as Address);

    // A. If depositTxHash is provided (Step 2: Verification)
    if (depositTxHash) {
        console.log(`[CCTP] Verifying deposit hash: ${depositTxHash}`);
        try {
            const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTxHash as `0x${string}` });

            if (receipt.status !== "success") {
                throw new Error("Deposit transaction failed on-chain");
            }
        } catch (e) {
            return {
                success: false,
                errorReason: `Invalid deposit transaction: ${e instanceof Error ? e.message : "Unknown error"}`
            };
        }

        // B. Check Balance (Wait logic) - Only check if we have a hash implying a deposit matched
        let facilitatorBalance = BigInt(0);
        const maxRetries = 5;

        for (let i = 0; i < maxRetries; i++) {
            facilitatorBalance = await publicClient.readContract({
                address: usdcAddress,
                abi: usdcErc3009Abi,
                functionName: "balanceOf",
                args: [facilitatorAccount.address]
            }) as bigint;

            if (facilitatorBalance >= amountBigInt) break;
            await new Promise(r => setTimeout(r, 2000));
        }

        if (facilitatorBalance < amountBigInt) {
            return {
                success: false,
                errorReason: "Deposit verified but facilitator balance insufficient (Funds sent to wrong address?)"
            };
        }

    } else {
        // No hash provided -> Always Prompt for Deposit (Strict Push Model)
        console.log("[SDK v0.4.22] No deposit hash. Returning PENDING_USER_DEPOSIT.");
        return {
            success: true,
            data: {
                depositAddress: facilitatorAccount.address,
                amountToDeposit: amountBigInt.toString(),
                chainId: networkConfig.chainId
            },
            attestation: {
                message: "PENDING_USER_DEPOSIT_v22",
                attestation: "0x"
            },
            transactionHash: "PENDING_USER_DEPOSIT_v22"
        };
    }

    // Funds are present, proceed to bridge
    const transferHash = (depositTxHash as `0x${string}`) || "0x0000000000000000000000000000000000000000000000000000000000000000";

    return executeCCTPBridge(sourceChain, amount, crossChainConfig, facilitatorPrivateKey, recipient as Address, transferHash, fromAddress as Address);
}

export async function executeCCTPBridge(
    sourceChain: FacilitatorChainKey,
    amount: string,
    crossChainConfig: CrossChainConfig,
    facilitatorPrivateKey: string,
    recipient: Address | undefined,
    transferHash: `0x${string}`,
    payerAddress: Address
): Promise<SettleResponse> {
    if (!facilitatorPrivateKey) {
        return { success: false, errorReason: "Facilitator Private Key not provided" };
    }

    const networkConfig = FACILITATOR_NETWORKS[sourceChain];
    if (!networkConfig) {
        return { success: false, errorReason: `Unsupported chain: ${sourceChain}` };
    }

    // Setup clients
    const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey as `0x${string}`);
    const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl)
    });
    const walletClient = createWalletClient({
        account: facilitatorAccount,
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl)
    });

    // Convert human readable string (e.g. "0.01") to atomic units (6 decimals)
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
    const feeRaw = calculateFee();
    const fee = BigInt(Math.floor(feeRaw * 1_000_000));
    const minRequired = fee;

    if (amountBigInt <= minRequired) {
        return {
            success: false,
            transactionHash: transferHash,
            errorReason: `Amount too small. Minimum required: ${Number(minRequired) / 1_000_000} USDC (to cover bridge fees)`
        };
    }

    // Re-verify Balance (Double Check)
    let facilitatorBalance = BigInt(0);
    const maxRetries = 2;

    for (let i = 0; i < maxRetries; i++) {
        facilitatorBalance = await publicClient.readContract({
            address: networkConfig.usdc,
            abi: usdcErc3009Abi,
            functionName: "balanceOf",
            args: [facilitatorAccount.address]
        }) as bigint;

        if (facilitatorBalance >= amountBigInt) break;

        console.log(`[CCTP] Balance lag detected. Retrying ${i + 1}/${maxRetries}... (Has: ${facilitatorBalance}, Needs: ${amountBigInt})`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
    }

    if (facilitatorBalance < amountBigInt) {
        return {
            success: false,
            transactionHash: transferHash,
            errorReason: `Insufficient facilitator balance after retries. Has: ${facilitatorBalance}, Needs: ${amountBigInt}`
        };
    }

    // Step 2: Approve TokenMessenger
    try {
        const approveHash = await walletClient.writeContract({
            chain: networkConfig.chain,
            address: networkConfig.usdc,
            abi: usdcErc3009Abi,
            functionName: "approve",
            args: [networkConfig.tokenMessenger, maxUint256]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
    } catch (e) {
        console.error("Approval failed", e);
        return {
            success: false,
            transactionHash: transferHash,
            errorReason: "Approval failed"
        };
    }

    // Step 3: DepositForBurn
    const targetRecipient = recipient || crossChainConfig.mintRecipient;
    const mintRecipient = addressToBytes32(targetRecipient);

    // Dynamic maxFee calculation (1%, min 200 wei)
    const maxFee = amountBigInt > BigInt(100)
        ? BigInt(Math.floor(Math.max(Number(amountBigInt) / 100, 200)))
        : BigInt(200);

    let burnHash: `0x${string}`;
    try {
        burnHash = await walletClient.writeContract({
            chain: networkConfig.chain,
            address: networkConfig.tokenMessenger,
            abi: tokenMessengerAbi,
            functionName: "depositForBurn",
            args: [
                amountBigInt - fee, // Deduct 0.02 USDC Fee
                crossChainConfig.destinationDomain,
                mintRecipient,
                networkConfig.usdc,
                "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
                maxFee,
                1000 // minFinalityThreshold
            ]
        });

        const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });
        if (burnReceipt.status !== "success") throw new Error("Burn execution failed");

    } catch (e) {
        return {
            success: false,
            transactionHash: transferHash,
            errorReason: e instanceof Error ? e.message : "Burn failed"
        };
    }

    // Step 4: Wait for Attestation
    let attestationResponse;
    try {
        attestationResponse = await createRetrieveAttestation(
            burnHash,
            networkConfig.domain.toString(),
            120000 // 2 min timeout
        );
    } catch (e) {
        console.warn("Attestation timeout", e);
        return {
            success: true, // Functionally a "pending" state 
            transactionHash: transferHash,
            burnTransactionHash: burnHash,
            errorReason: "Attestation timeout. Funds burned but not minted."
        };
    }

    if (!attestationResponse) {
        return {
            success: false,
            transactionHash: transferHash,
            burnTransactionHash: burnHash,
            errorReason: "Attestation failed to retireve"
        };
    }


    // Step 5: Mint (receiveMessage) on Destination Chain
    let mintHash: `0x${string}` | undefined;
    try {
        const destNetworkConfig = FACILITATOR_NETWORKS[crossChainConfig.destinationChain as FacilitatorChainKey];
        if (!destNetworkConfig) throw new Error(`Unsupported destination chain: ${crossChainConfig.destinationChain}`);

        const destWalletClient = createWalletClient({
            account: facilitatorAccount,
            chain: destNetworkConfig.chain,
            transport: http(destNetworkConfig.rpcUrl)
        });

        const destPublicClient = createPublicClient({
            chain: destNetworkConfig.chain,
            transport: http(destNetworkConfig.rpcUrl)
        });

        console.log(`[CCTP] Minting on ${crossChainConfig.destinationChain}...`);

        mintHash = await destWalletClient.writeContract({
            chain: destNetworkConfig.chain,
            address: destNetworkConfig.messageTransmitter,
            abi: messageTransmitterAbi,
            functionName: "receiveMessage",
            args: [
                attestationResponse.message as `0x${string}`,
                attestationResponse.attestation as `0x${string}`
            ]
        });

        console.log(`[CCTP] Mint tx sent: ${mintHash}`);
        await destPublicClient.waitForTransactionReceipt({ hash: mintHash });
        console.log(`[CCTP] Mint confirmed!`);

    } catch (e) {
        console.error("Mint failed", e);
        return {
            success: true,
            transactionHash: transferHash,
            burnTransactionHash: burnHash,
            errorReason: "Mint execution failed (Gas error on Dest?)"
        };
    }

    return {
        success: true,
        transactionHash: transferHash,
        burnTransactionHash: burnHash,
        mintTransactionHash: mintHash,
        payer: payerAddress,
        fee: fee.toString(),
        netAmount: amountBigInt.toString(),
        attestation: {
            message: attestationResponse.message,
            attestation: attestationResponse.attestation
        }
    };
}
