// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./SimpleSmartAccount.sol";

/**
 * @title SmartAccountFactory
 * @notice Factory contract to deploy SimpleSmartAccount using CREATE2
 * @dev Uses OpenZeppelin Clones for minimal proxy deployment
 */
contract SmartAccountFactory {
    using Clones for address;

    /// @notice The implementation contract address
    address public immutable accountImplementation;

    /// @notice The EntryPoint contract address
    IEntryPoint public immutable entryPoint;

    /// @notice Emitted when a new account is created
    event AccountCreated(
        address indexed account,
        address indexed owner,
        uint256 salt
    );

    /**
     * @notice Constructor deploys the implementation contract
     * @param _entryPoint The EntryPoint contract address
     */
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        accountImplementation = address(new SimpleSmartAccount(_entryPoint));
    }

    /**
     * @notice Create a new smart account for an owner
     * @dev Uses CREATE2 for deterministic deployment
     * @param owner The owner address (EOA) of the new account
     * @param salt A unique salt for CREATE2
     * @return account The address of the deployed account
     */
    function createAccount(
        address owner,
        uint256 salt
    ) external returns (address account) {
        // Calculate the deterministic address
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        account = accountImplementation.predictDeterministicAddress(saltHash);

        // Check if already deployed
        if (account.code.length > 0) {
            return account;
        }

        // Deploy the clone
        account = accountImplementation.cloneDeterministic(saltHash);

        // Initialize with owner
        SimpleSmartAccount(payable(account)).initialize(owner);

        emit AccountCreated(account, owner, salt);
    }

    /**
     * @notice Calculate the counterfactual address of an account
     * @param owner The owner address
     * @param salt The salt value
     * @return The predicted account address
     */
    function getAccountAddress(
        address owner,
        uint256 salt
    ) external view returns (address) {
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        return accountImplementation.predictDeterministicAddress(saltHash);
    }

    /**
     * @notice Check if an account is already deployed
     * @param owner The owner address
     * @param salt The salt value
     * @return True if deployed, false otherwise
     */
    function isAccountDeployed(
        address owner,
        uint256 salt
    ) external view returns (bool) {
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        address account = accountImplementation.predictDeterministicAddress(
            saltHash
        );
        return account.code.length > 0;
    }
}
