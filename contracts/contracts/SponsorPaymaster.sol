// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
contract SponsorPaymaster is BasePaymaster {

    /**
     * @notice Constructor
     * @param _entryPoint The EntryPoint contract address
     */
    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    /**
     * @notice Validate a paymaster user operation
     * @dev Called by EntryPoint to check if paymaster will sponsor
     * @param userOp The UserOperation
     * @param userOpHash The hash of the UserOperation
     * @param maxCost The maximum cost of the operation
     * @return context Context for postOp
     * @return validationData Validation result
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    )
        internal
        view
        override
        returns (bytes memory context, uint256 validationData)
    {
        (userOpHash); // Silence unused variable warning
        (maxCost); // Silence unused variable warning

        // Sponsoring EVERYTHING. No checks.
        // In production, this would be dangerous (wallet drain), 
        // but for this specific "Commission Model" use case, it's what is requested.
        
        // Return sender as context for postOp (if needed, though we do nothing there)
        context = abi.encode(userOp.sender);
        validationData = 0; // Valid
    }

    /**
     * @notice Post-operation handler
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        // No-op: We don't track anything.
        (mode);
        (context);
        (actualGasCost);
    }
}
