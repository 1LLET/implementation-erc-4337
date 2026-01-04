import { type Address, type Hash } from "viem";
import { type ChainConfig, type UserOperation, type GasEstimate, type UserOpReceipt, type ApprovalSupportResult } from "./types";

export class BundlerClient {
    private bundlerUrl: string;
    private chainId: number;
    private entryPointAddress: Address;

    constructor(config: ChainConfig, entryPointAddress: Address) {
        this.bundlerUrl = config.bundlerUrl;
        this.chainId = config.chain.id;
        this.entryPointAddress = entryPointAddress;
    }

    private async call(method: string, params: any[]): Promise<any> {
        const response = await fetch(this.bundlerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method,
                params,
            }),
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return result.result;
    }

    async estimateGas(userOp: Partial<UserOperation>): Promise<GasEstimate> {
        return await this.call("eth_estimateUserOperationGas", [
            {
                sender: userOp.sender,
                nonce: userOp.nonce ? "0x" + userOp.nonce.toString(16) : "0x0",
                initCode: userOp.initCode || "0x",
                callData: userOp.callData || "0x",
                paymasterAndData: userOp.paymasterAndData || "0x",
                signature: "0x",
            },
            this.entryPointAddress,
        ]);
    }

    async sendUserOperation(userOp: UserOperation): Promise<Hash> {
        return await this.call("eth_sendUserOperation", [
            {
                sender: userOp.sender,
                nonce: "0x" + userOp.nonce.toString(16),
                initCode: userOp.initCode,
                callData: userOp.callData,
                callGasLimit: "0x" + userOp.callGasLimit.toString(16),
                verificationGasLimit: "0x" + userOp.verificationGasLimit.toString(16),
                preVerificationGas: "0x" + userOp.preVerificationGas.toString(16),
                maxFeePerGas: "0x" + userOp.maxFeePerGas.toString(16),
                maxPriorityFeePerGas: "0x" + userOp.maxPriorityFeePerGas.toString(16),
                paymasterAndData: userOp.paymasterAndData,
                signature: userOp.signature,
            },
            this.entryPointAddress,
        ]);
    }

    async waitForUserOperation(userOpHash: Hash, timeout = 60000): Promise<UserOpReceipt> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const result = await this.call("eth_getUserOperationReceipt", [userOpHash]);

            if (result) {
                return result as UserOpReceipt;
            }

            // Wait 2 seconds before polling again
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        throw new Error("Timeout waiting for UserOperation");
    }

    async requestApprovalSupport(token: Address, owner: Address, spender: Address, amount: bigint): Promise<ApprovalSupportResult> {
        return await this.call("pm_requestApprovalSupport", [
            token,
            owner,
            spender,
            amount.toString()
        ]);
    }
}
