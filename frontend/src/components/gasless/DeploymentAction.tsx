import React from "react";
import { Status } from "@/hooks/useGaslessTransfer";

interface DeploymentActionProps {
    isDeployed: boolean;
    status: Status;
    onDeploy: () => void;
}

export function DeploymentAction({
    isDeployed,
    status,
    onDeploy,
}: DeploymentActionProps) {
    if (isDeployed) return null;

    const isBusy =
        status === "building" ||
        status === "signing" ||
        status === "sending" ||
        status === "confirming";

    return (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-4">
            <p className="text-yellow-400 font-semibold mb-2">
                Account Deployment Required
            </p>
            <p className="text-yellow-200 text-sm mb-3">
                You must deploy your smart account before you can send transactions.
            </p>
            <button
                onClick={onDeploy}
                disabled={isBusy}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
            >
                Deploy Smart Account
            </button>
        </div>
    );
}
