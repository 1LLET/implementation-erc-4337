import {
    type Address,
    type Hex,
    formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { type Config } from "../config.js";
import { erc20Abi } from "../utils/abis.js";

export type ApprovalType = "permit" | "approve" | "none";

export interface ApprovalAction {
    type: ApprovalType;
    gasCost?: bigint;
    fundingNeeded?: bigint;
}

/**
 * Check if a token supports permit by checking for DOMAIN_SEPARATOR or nonces
 */
export async function checkPermitSupport(
    token: Address,
    owner: Address,
    config: Config
): Promise<boolean> {
    try {
        // Try to read DOMAIN_SEPARATOR (EIP-2612)
        await config.publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "DOMAIN_SEPARATOR",
        });
        return true;
    } catch {
        try {
            // Fallback: try to read nonces
            await config.publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "nonces",
                args: [owner],
            });
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Determine the best approval action (Permit vs Approve)
 * Checks allowance first.
 */
export async function getApprovalAction(
    token: Address,
    owner: Address,
    spender: Address,
    amount: bigint,
    config: Config
): Promise<ApprovalAction> {
    // 1. Check current allowance
    const allowance = await config.publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
    });

    if (allowance >= amount) {
        return { type: "none" };
    }

    // 2. Check for Permit support
    // FOR DEMO: Temporarily disabling Permit check to force "Fund + Approve" flow
    // as the frontend doesn't rely on Permit yet.
    /*
    const supportsPermit = await checkPermitSupport(token, owner, config);
    if (supportsPermit) {
        return { type: "permit" };
    }
    */

    // 3. Fallback to Approve (Calculate gas cost)
    try {
        const gas = await config.publicClient.estimateContractGas({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, amount],
            account: owner,
        });

        // Add buffer
        const gasLimit = (gas * 120n) / 100n;
        const { maxFeePerGas } = await config.publicClient.estimateFeesPerGas();
        const gasCost = gasLimit * (maxFeePerGas || 1n);

        // Check if EOA needs funding
        const safeGasCost = gasCost * 2n;
        const balance = await config.publicClient.getBalance({ address: owner });
        const fundingNeeded = balance < safeGasCost ? safeGasCost - balance : 0n;

        return { type: "approve", gasCost: safeGasCost, fundingNeeded };
    } catch (error) {
        console.warn("Retrying gas estimation with fixed buffer due to failure:", error);
        // Fallback if gas estimation fails (e.g. no funds)
        // Assume ~50k gas for approve
        const gasLimit = 50000n;
        const { maxFeePerGas } = await config.publicClient.estimateFeesPerGas();
        const gasCost = gasLimit * (maxFeePerGas || 1n);

        const safeGasCost = gasCost * 2n;
        const balance = await config.publicClient.getBalance({ address: owner });
        const fundingNeeded = balance < safeGasCost ? safeGasCost - balance : 0n;

        return { type: "approve", gasCost: safeGasCost, fundingNeeded };
    }
}

/**
 * Execute the Approve flow:
 * 1. Fund EOA from Relayer if needed
 * 2. Execute approve tx from EOA
 */
export async function fundAndApprove(
    token: Address,
    ownerPrivateKey: Hex,
    spender: Address,
    amount: bigint,
    config: Config
): Promise<Hex> {
    const account = privateKeyToAccount(ownerPrivateKey);
    const action = await getApprovalAction(token, account.address, spender, amount, config);

    if (action.type === "none") {
        console.log("Approval not needed (sufficient allowance)");
        return "0x";
    }

    if (action.type === "permit") {
        throw new Error("Token supports permit. Use signPermit instead.");
    }

    // Handle funding
    if (action.fundingNeeded && action.fundingNeeded > 0n) {
        console.log(
            `Funding EOA ${account.address} with ${formatEther(action.fundingNeeded)} ETH`
        );

        const fundTx = await config.walletClient.sendTransaction({
            account: config.walletClient.account!,
            to: account.address,
            value: action.fundingNeeded,
            chain: config.chain,
        });

        console.log(`Funding transaction hash: ${fundTx}`);
        await config.publicClient.waitForTransactionReceipt({ hash: fundTx });
        console.log("Funding complete.");
    }

    // Execute Approve
    console.log(`Approving ${spender} to spend ${amount} tokens from ${account.address}`);
    const approveTx = await config.walletClient.writeContract({
        account,
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
        chain: config.chain,
    });

    console.log(`Approve transaction hash: ${approveTx}`);
    return approveTx;
}

/**
 * Request support for an approval:
 * - Checks if approval is needed
 * - Checks for Permit support
 * - If Approve is needed and user lacks funds, funds the user from Bundler
 * - Returns the action to take (Permit or Approve)
 */
export async function requestApprovalSupport(
    token: Address,
    owner: Address,
    spender: Address,
    amount: bigint,
    config: Config
): Promise<ApprovalAction & { fundedAmount?: string }> {
    const action = await getApprovalAction(token, owner, spender, amount, config);

    let fundedAmount = "0";

    if (action.type === "approve" && action.fundingNeeded && action.fundingNeeded > 0n) {
        console.log(
            `Funding EOA ${owner} with ${formatEther(action.fundingNeeded)} ETH`
        );

        const fundTx = await config.walletClient.sendTransaction({
            account: config.walletClient.account!,
            to: owner,
            value: action.fundingNeeded,
            chain: config.chain,
        });

        console.log(`Funding transaction hash: ${fundTx}`);
        await config.publicClient.waitForTransactionReceipt({ hash: fundTx });
        console.log("Funding complete.");

        fundedAmount = formatEther(action.fundingNeeded);
    }

    return { ...action, fundedAmount };
}
