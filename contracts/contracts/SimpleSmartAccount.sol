// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title SimpleSmartAccount
 * @notice ERC-4337 compliant smart account with single owner
 * @dev Implements IAccount interface for Account Abstraction
 */
contract SimpleSmartAccount is IAccount, Initializable {
    using ECDSA for bytes32;

    /// @notice The EntryPoint contract address (v0.6)
    IEntryPoint public immutable entryPoint;

    /// @notice The owner (EOA) that controls this account
    address public owner;

    /// @notice Emitted when the account executes a call
    event Executed(address indexed target, uint256 value, bytes data);

    /// @notice Emitted when the account executes a batch of calls
    event ExecutedBatch(address[] targets, uint256[] values, bytes[] datas);

    /// @notice Only the EntryPoint can call this function
    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Only EntryPoint");
        _;
    }

    /// @notice Only the owner or EntryPoint can call this function
    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == address(entryPoint),
            "Only owner or EntryPoint"
        );
        _;
    }

    /**
     * @notice Constructor sets the EntryPoint address
     * @param _entryPoint The EntryPoint contract address
     */
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _disableInitializers();
    }

    /**
     * @notice Initialize the account with an owner
     * @param _owner The owner address (EOA)
     */
    function initialize(address _owner) external initializer {
        require(_owner != address(0), "Invalid owner");
        owner = _owner;
    }

    /**
     * @notice Validate a UserOperation signature
     * @dev Called by EntryPoint to validate the signature
     * @param userOp The UserOperation to validate
     * @param userOpHash The hash of the UserOperation
     * @param missingAccountFunds The amount of funds missing for the account
     * @return validationData 0 if valid, 1 if invalid signature
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Verify the signature
        validationData = _validateSignature(userOp, userOpHash);

        // Pay prefund if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds
            }("");
            // Ignore failure (EntryPoint will handle it)
            (success);
        }
    }

    /**
     * @notice Validate the signature of a UserOperation
     * @param userOp The UserOperation containing the signature
     * @param userOpHash The hash to verify against
     * @return validationData 0 if valid, 1 if invalid
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        bytes32 ethSignedHash = userOpHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(userOp.signature);

        if (recovered != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }
        return 0; // Valid
    }

    /**
     * @notice Execute a call from this account
     * @param target The target address to call
     * @param value The ETH value to send
     * @param data The calldata to send
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwnerOrEntryPoint {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value, data);
    }

    /**
     * @notice Execute a batch of calls from this account
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param datas Array of calldatas
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrEntryPoint {
        require(
            targets.length == values.length && values.length == datas.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{
                value: values[i]
            }(datas[i]);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }

        emit ExecutedBatch(targets, values, datas);
    }

    /**
     * @notice Get the nonce from the EntryPoint
     * @return The current nonce
     */
    function getNonce() public view returns (uint256) {
        return entryPoint.getNonce(address(this), 0);
    }

    /**
     * @notice Deposit ETH to the EntryPoint for this account
     */
    function addDeposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @notice Get the deposit balance in the EntryPoint
     * @return The deposit balance
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @notice Withdraw deposit from the EntryPoint
     * @param withdrawAddress The address to send the withdrawn ETH to
     * @param amount The amount to withdraw
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public {
        require(msg.sender == owner, "Only owner");
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}

    /**
     * @notice Fallback function
     */
    fallback() external payable {}
}
