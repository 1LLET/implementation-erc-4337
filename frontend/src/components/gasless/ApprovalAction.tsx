import React from "react";
import { maxUint256 } from "viem";
import { Status } from "@/hooks/useGaslessTransfer";

interface ApprovalActionProps {
    isDeployed: boolean;
    allowance: bigint;
    status: Status;
    onApprove: () => void;
}

export function ApprovalAction({
    isDeployed,
    allowance,
    status,
    onApprove,
}: ApprovalActionProps) {
    const hasInfinite = allowance > maxUint256 / 2n;

    if (!isDeployed || hasInfinite) return null;

    const canInteract = status === "connected" || status === "success";

    return (
        <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600">
            <h3 className="text-gray-300 font-semibold mb-3">Enable USDC Spend</h3>
            <div className="flex gap-2">
                <button
                    onClick={onApprove}
                    disabled={!canInteract}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                    Approve Infinite Amount
                </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">
                Approves Smart Account to spend your USDC (Infinite). <br />
                (Gasless for you: Bundler refunds gas if needed)
            </p>
        </div>
    );
}
