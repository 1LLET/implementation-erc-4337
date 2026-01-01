// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SponsorPaymaster
 * @notice Paymaster that sponsors gas for whitelisted accounts
 * @dev Implements daily limits per account
 */
contract SponsorPaymaster is BasePaymaster {
    using ECDSA for bytes32;

    /// @notice Daily gas limit per account (in wei, for gas cost)
    uint256 public dailyLimit;

    /// @notice Mapping of whitelisted accounts
    mapping(address => bool) public whitelistedAccounts;

    /// @notice Daily spent amount per account
    mapping(address => uint256) public dailySpent;

    /// @notice Last reset day per account (day number since epoch)
    mapping(address => uint256) public lastResetDay;

    /// @notice Emitted when an account is whitelisted or removed
    event WhitelistUpdated(address indexed account, bool whitelisted);

    /// @notice Emitted when daily limit is updated
    event DailyLimitUpdated(uint256 newLimit);

    /// @notice Emitted when gas is sponsored for an account
    event GasSponsored(
        address indexed account,
        uint256 actualGasCost,
        uint256 dailySpentAfter
    );

    /**
     * @notice Constructor
     * @param _entryPoint The EntryPoint contract address
     * @param _dailyLimit The daily limit per account (in wei)
     */
    constructor(
        IEntryPoint _entryPoint,
        uint256 _dailyLimit
    ) BasePaymaster(_entryPoint) {
        dailyLimit = _dailyLimit;
    }

    /**
     * @notice Set whitelist status for an account
     * @param account The account address
     * @param whitelisted Whether to whitelist or remove
     */
    function setWhitelisted(
        address account,
        bool whitelisted
    ) external onlyOwner {
        whitelistedAccounts[account] = whitelisted;
        emit WhitelistUpdated(account, whitelisted);
    }

    /**
     * @notice Set whitelist status for multiple accounts
     * @param accounts Array of account addresses
     * @param whitelisted Whether to whitelist or remove
     */
    function setWhitelistedBatch(
        address[] calldata accounts,
        bool whitelisted
    ) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelistedAccounts[accounts[i]] = whitelisted;
            emit WhitelistUpdated(accounts[i], whitelisted);
        }
    }

    /**
     * @notice Update the daily limit
     * @param _dailyLimit New daily limit in wei
     */
    function setDailyLimit(uint256 _dailyLimit) external onlyOwner {
        dailyLimit = _dailyLimit;
        emit DailyLimitUpdated(_dailyLimit);
    }


    /**
     * @notice Get the current day number (days since epoch)
     * @return The current day number
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /**
     * @notice Get remaining daily allowance for an account
     * @param account The account address
     * @return The remaining allowance in wei
     */
    function getRemainingDailyAllowance(
        address account
    ) public view returns (uint256) {
        uint256 currentDay = getCurrentDay();
        if (lastResetDay[account] < currentDay) {
            return dailyLimit;
        }
        if (dailySpent[account] >= dailyLimit) {
            return 0;
        }
        return dailyLimit - dailySpent[account];
    }

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

        address sender = userOp.sender;

        // No whitelist check - accept all accounts

        // Check daily limit
        uint256 currentDay = getCurrentDay();
        uint256 spent = dailySpent[sender];

        // Reset if new day
        if (lastResetDay[sender] < currentDay) {
            spent = 0;
        }

        require(spent + maxCost <= dailyLimit, "Daily limit exceeded");

        // Return sender as context for postOp
        context = abi.encode(sender, maxCost);
        validationData = 0; // Valid
    }

    /**
     * @notice Post-operation handler
     * @dev Called after the user operation is executed
     * @param mode The post-op mode
     * @param context Context from validatePaymasterUserOp
     * @param actualGasCost The actual gas cost
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (mode); // Silence unused variable warning

        (address sender, ) = abi.decode(context, (address, uint256));

        uint256 currentDay = getCurrentDay();

        // Reset if new day
        if (lastResetDay[sender] < currentDay) {
            dailySpent[sender] = 0;
            lastResetDay[sender] = currentDay;
        }

        // Update spent amount
        dailySpent[sender] += actualGasCost;

        emit GasSponsored(sender, actualGasCost, dailySpent[sender]);
    }

}
