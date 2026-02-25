// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VaultAndYield
 * @dev Fixed-term staking mechanism for IC tokens with time-based APY rewards
 * @notice Allows users to stake IC tokens for fixed durations and earn yield
 */
contract VaultAndYield is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public owner;

    /// @notice Structure to represent a user's stake
    struct Stake {
        uint256 amount;        // Amount of tokens staked
        uint256 startTime;     // Timestamp when stake was created
        uint256 duration;      // Duration of the stake in seconds
        uint256 apy;          // Annual Percentage Yield (in basis points)
        bool withdrawn;       // Whether the stake has been withdrawn
    }

    /// @notice Mapping from user address to array of their stakes
    mapping(address => Stake[]) public userStakes;

    /// @notice Reference to the IC token contract
    IERC20 public icToken;

    /// @notice Total amount of IC tokens staked in the contract
    uint256 public totalStaked;

    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Seconds in a year for APY calculations
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Supported staking durations and their corresponding APYs
    mapping(uint256 => uint256) public durationToApy;

    /// @notice Emitted when a user stakes tokens
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 duration,
        uint256 apy
    );

    /// @notice Emitted when a user withdraws their stake and rewards
    event Withdrawn(
        address indexed user,
        uint256 indexed stakeId,
        uint256 stakedAmount,
        uint256 rewards,
        uint256 totalWithdrawn
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "VaultAndYield: Only owner can call this function");
        _;
    }

    /**
     * @dev Constructor sets up the staking contract with IC token reference
     * @param _icToken Address of the IC token contract
     */
    constructor(address _icToken) {
        require(_icToken != address(0), "VaultAndYield: IC token cannot be zero address");
        
        icToken = IERC20(_icToken);

        // Set up duration to APY mappings (APY in basis points)
        durationToApy[30 days] = 700;   // 30 days = 7% APY
        durationToApy[90 days] = 900;   // 90 days = 9% APY
        durationToApy[180 days] = 1200; // 180 days = 12% APY
        durationToApy[365 days] = 1500; // 365 days = 15% APY
        durationToApy[730 days] = 1800; // 730 days = 18% APY
        owner = msg.sender;
    }

    /**
     * @notice Stakes IC tokens for a fixed duration
     * @dev Transfers tokens from user and creates a new stake
     * @param _amount Amount of IC tokens to stake
     * @param _duration Duration to stake for (must be a supported duration)
     */
    function stake(uint256 _amount, uint256 _duration) external nonReentrant {
        require(_amount > 0, "VaultAndYield: Amount must be greater than zero");
        require(durationToApy[_duration] > 0, "VaultAndYield: Unsupported staking duration");

        // Transfer IC tokens from user to this contract
        icToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Get APY for the duration
        uint256 apy = durationToApy[_duration];

        // Create new stake
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: _amount,
            startTime: block.timestamp,
            duration: _duration,
            apy: apy,
            withdrawn: false
        }));

        // Update total staked amount
        totalStaked += _amount;

        emit Staked(msg.sender, stakeId, _amount, _duration, apy);
    }

    /**
     * @notice Withdraws a matured stake with rewards
     * @dev Can only withdraw stakes that have completed their duration
     * @param _stakeId Index of the stake to withdraw
     */
    function withdraw(uint256 _stakeId) external nonReentrant {
        require(_stakeId < userStakes[msg.sender].length, "VaultAndYield: Invalid stake ID");
        
        Stake storage userStake = userStakes[msg.sender][_stakeId];
        require(!userStake.withdrawn, "VaultAndYield: Stake already withdrawn");
        require(
            block.timestamp >= userStake.startTime + userStake.duration,
            "VaultAndYield: Stake not yet matured"
        );

        // Calculate rewards: (amount * apy * duration) / (365 days * 10000)
        uint256 rewards = (userStake.amount * userStake.apy * userStake.duration) / 
                         (SECONDS_PER_YEAR * BASIS_POINTS);

        // Mark stake as withdrawn
        userStake.withdrawn = true;

        // Update total staked amount
        totalStaked -= userStake.amount;

        // Calculate total withdrawal amount
        uint256 totalWithdrawal = userStake.amount + rewards;

        // Transfer tokens back to user (principal + rewards)
        // Note: In a production environment, rewards would come from a separate reward pool
        // For this implementation, we assume the contract has sufficient balance
        icToken.safeTransfer(msg.sender, totalWithdrawal);

        emit Withdrawn(msg.sender, _stakeId, userStake.amount, rewards, totalWithdrawal);
    }

    /**
     * @notice Gets the number of stakes for a user
     * @param _user Address of the user
     * @return Number of stakes the user has created
     */
    function getUserStakeCount(address _user) external view returns (uint256) {
        return userStakes[_user].length;
    }

    /**
     * @notice Gets detailed information about a user's stake
     * @param _user Address of the user
     * @param _stakeId Index of the stake
     * @return amount Amount staked
     * @return startTime When the stake was created
     * @return duration Duration of the stake
     * @return apy APY of the stake
     * @return withdrawn Whether the stake has been withdrawn
     * @return matured Whether the stake has matured
     * @return expectedRewards Expected rewards for the stake
     */
    function getStakeInfo(address _user, uint256 _stakeId) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint256 apy,
        bool withdrawn,
        bool matured,
        uint256 expectedRewards
    ) {
        require(_stakeId < userStakes[_user].length, "VaultAndYield: Invalid stake ID");
        
        Stake storage userStake = userStakes[_user][_stakeId];
        
        amount = userStake.amount;
        startTime = userStake.startTime;
        duration = userStake.duration;
        apy = userStake.apy;
        withdrawn = userStake.withdrawn;
        matured = block.timestamp >= userStake.startTime + userStake.duration;
        expectedRewards = (userStake.amount * userStake.apy * userStake.duration) / 
                         (SECONDS_PER_YEAR * BASIS_POINTS);
    }

    /**
     * @notice Gets all supported staking durations and their APYs
     * @return durations Array of supported durations in seconds
     * @return apys Array of corresponding APYs in basis points
     */
    function getSupportedDurations() external pure returns (
        uint256[] memory durations,
        uint256[] memory apys
    ) {
        durations = new uint256[](5);
        apys = new uint256[](5);
        
        durations[0] = 30 days;
        durations[1] = 90 days;
        durations[2] = 180 days;
        durations[3] = 365 days;
        durations[4] = 730 days;
        
        apys[0] = 700;   // 7%
        apys[1] = 900;   // 9%
        apys[2] = 1200;  // 12%
        apys[3] = 1500;  // 15%
        apys[4] = 1800;  // 18%
    }

    /**
     * @notice Gets the total value locked (TVL) in the contract
     * @return Total amount of IC tokens staked
     */
    function getTotalValueLocked() external view returns (uint256) {
        return totalStaked;
    }

    /**
     * @notice Calculates expected rewards for a given amount and duration
     * @param _amount Amount to stake
     * @param _duration Duration to stake for
     * @return Expected rewards for the stake
     */
    function calculateExpectedRewards(uint256 _amount, uint256 _duration) external view returns (uint256) {
        require(durationToApy[_duration] > 0, "VaultAndYield: Unsupported staking duration");
        
        uint256 apy = durationToApy[_duration];
        return (_amount * apy * _duration) / (SECONDS_PER_YEAR * BASIS_POINTS);
    }

    /**
     * @notice Emergency function to recover tokens (only for development/testing)
     * @dev In production, this should be protected by governance
     * @param _token Token address to recover
     * @param _amount Amount to recover
     * @param _to Address to send recovered tokens to
     */
    function emergencyRecover(address _token, uint256 _amount, address _to) onlyOwner external  {
        // In production, this should be protected by governance/admin roles
        require(_to != address(0), "VaultAndYield: Cannot recover to zero address");
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
