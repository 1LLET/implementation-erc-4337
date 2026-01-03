import {
    type Address,
    type Hash,
    type Hex,
    type PublicClient,
    encodeFunctionData,
    encodeAbiParameters,
    keccak256
} from "viem";
import { type ChainConfig, type UserOperation, type GasEstimate } from "./types";
import { BundlerClient } from "./BundlerClient";
import { factoryAbi, smartAccountAbi, entryPointAbi } from "./constants";

export class UserOpBuilder {
    private chainConfig: ChainConfig;
    private bundlerClient: BundlerClient;
    private publicClient: PublicClient;
    private entryPointAddress: Address;
    private factoryAddress: Address;

    constructor(
        chainConfig: ChainConfig,
        bundlerClient: BundlerClient,
        publicClient: PublicClient
    ) {
        this.chainConfig = chainConfig;
        this.bundlerClient = bundlerClient;
        this.publicClient = publicClient;

        // Resolved in AA or here? Let's assume passed valid config or resolve again
        // Ideally we shouldn't duplicate logic. AA resolves them.
        // Let's rely on config having them or resolving valid ones.
        // For now take from config or defaults.
        this.entryPointAddress = chainConfig.entryPointAddress!; // Assumed validated by AA
        this.factoryAddress = chainConfig.factoryAddress!;
    }

    async getNonce(smartAccountAddress: Address): Promise<bigint> {
        return await this.publicClient.readContract({
            address: this.entryPointAddress,
            abi: entryPointAbi,
            functionName: "getNonce",
            args: [smartAccountAddress, 0n],
        }) as bigint;
    }

    buildInitCode(owner: Address): Hex {
        const createAccountData = encodeFunctionData({
            abi: factoryAbi,
            functionName: "createAccount",
            args: [owner, 0n],
        });
        return `${this.factoryAddress}${createAccountData.slice(2)}` as Hex;
    }

    async isAccountDeployed(smartAccountAddress: Address): Promise<boolean> {
        const code = await this.publicClient.getCode({
            address: smartAccountAddress,
        });
        return code !== undefined && code !== "0x";
    }

    async buildUserOperationBatch(
        owner: Address,
        smartAccountAddress: Address,
        transactions: { target: Address; value: bigint; data: Hex }[]
    ): Promise<UserOperation> {
        const isDeployed = await this.isAccountDeployed(smartAccountAddress);
        const initCode = isDeployed ? "0x" : this.buildInitCode(owner);

        const targets = transactions.map((tx) => tx.target);
        const values = transactions.map((tx) => tx.value);
        const datas = transactions.map((tx) => tx.data);

        const callData = encodeFunctionData({
            abi: smartAccountAbi,
            functionName: "executeBatch",
            args: [targets, values, datas],
        });

        const nonce = await this.getNonce(smartAccountAddress);

        const partialOp = {
            sender: smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData,
            paymasterAndData: (this.chainConfig.paymasterAddress || "0x") as Hex,
        };

        const gasEstimate = await this.bundlerClient.estimateGas(partialOp);

        return {
            ...partialOp,
            callGasLimit: BigInt(gasEstimate.callGasLimit),
            verificationGasLimit: BigInt(gasEstimate.verificationGasLimit),
            preVerificationGas: BigInt(gasEstimate.preVerificationGas),
            maxFeePerGas: BigInt(gasEstimate.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasEstimate.maxPriorityFeePerGas),
            signature: "0x",
        };
    }

    async buildDeployUserOp(
        owner: Address,
        smartAccountAddress: Address
    ): Promise<UserOperation> {
        const isDeployed = await this.isAccountDeployed(smartAccountAddress);
        if (isDeployed) throw new Error("Account already deployed");

        const initCode = this.buildInitCode(owner);
        const callData = "0x";
        const nonce = await this.getNonce(smartAccountAddress);

        const partialOp = {
            sender: smartAccountAddress,
            nonce,
            initCode: initCode as Hex,
            callData: callData as Hex,
            paymasterAndData: (this.chainConfig.paymasterAddress || "0x") as Hex,
        };

        const gasEstimate = await this.bundlerClient.estimateGas(partialOp);

        return {
            ...partialOp,
            callGasLimit: BigInt(gasEstimate.callGasLimit),
            verificationGasLimit: BigInt(gasEstimate.verificationGasLimit),
            preVerificationGas: BigInt(gasEstimate.preVerificationGas),
            maxFeePerGas: BigInt(gasEstimate.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(gasEstimate.maxPriorityFeePerGas),
            signature: "0x",
        };
    }

    getUserOpHash(userOp: UserOperation): Hex {
        const packed = encodeAbiParameters(
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

        const packedHash = keccak256(packed);

        return keccak256(
            encodeAbiParameters(
                [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
                [packedHash, this.entryPointAddress, BigInt(this.chainConfig.chain.id)]
            )
        );
    }
}
