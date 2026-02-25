// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for IC token operations
interface IIC {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Interface for reserve tokens (ICBTC/ICAUT) operations
interface IReserveToken {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Interface for price oracle
interface IMockOracle {
    function btcPrice() external view returns (uint256);
    function goldPrice() external view returns (uint256);
}

/**
 * @title ICController
 * @dev Main controller for the IC system handling KYC, minting, and reserve management
 * @notice Controls the minting of IC tokens backed by ICBTC and ICAUT reserves
 */
contract ICController is AccessControl, ReentrancyGuard {
    /// @notice Role identifier for reserve management operations (includes KYC management)
    bytes32 public constant RESERVE_MANAGER_ROLE = keccak256("RESERVE_MANAGER_ROLE");

    /// @notice Mapping to track KYC status of users
    mapping(address => bool) public isKycPassed;

    /// @notice Reference to the IC token contract
    IIC public icToken;
    
    /// @notice Reference to the ICBTC token contract
    IReserveToken public icbtcToken;
    
    /// @notice Reference to the ICAUT token contract  
    IReserveToken public icautToken;
    
    /// @notice Reference to the price oracle contract
    IMockOracle public oracle;

    /// @notice Total ICBTC reserves held by this contract
    uint256 public totalIcbtcReserves;
    
    /// @notice Total ICAUT reserves held by this contract
    uint256 public totalIcautReserves;
    
    /// @notice Total IC tokens minted and backed by reserves
    uint256 public totalIcMinted;

    /// @notice Reserve ratio for ICBTC (40% = 4000 basis points)
    uint256 public constant ICBTC_RESERVE_RATIO = 4000;
    
    /// @notice Reserve ratio for ICAUT (60% = 6000 basis points)
    uint256 public constant ICAUT_RESERVE_RATIO = 6000;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Emitted when KYC status is granted
    event KycGranted(address indexed user, address indexed grantedBy);
    
    /// @notice Emitted when KYC status is revoked
    event KycRevoked(address indexed user, address indexed revokedBy);
    
    /// @notice Emitted when IC tokens are minted with backing reserves
    event IcMinted(address indexed to, uint256 icAmount, uint256 icbtcAmount, uint256 icautAmount);
    
    /// @notice Emitted when IC tokens are burned and reserves are returned
    event IcBurned(address indexed from, uint256 icAmount, uint256 icbtcReturned, uint256 icautReturned);

    /// @notice Emitted when reserve tokens are pre-minted for liquidity
    event ReserveTokensMinted(uint256 icbtcAmount, uint256 icautAmount, address indexed minter);

    /// @notice Emitted when reserve ratios are updated (for future use if ratios become dynamic)
    event ReserveRatiosUpdated(uint256 icbtcRatio, uint256 icautRatio, address indexed updatedBy);

    /**
     * @dev Constructor sets up the controller with token references
     * @param _icToken Address of the IC token contract
     * @param _icbtcToken Address of the ICBTC token contract
     * @param _icautToken Address of the ICAUT token contract
     * @param _oracle Address of the price oracle contract
     */
    constructor(
        address _icToken,
        address _icbtcToken,
        address _icautToken,
        address _oracle
    ) {
        require(_icToken != address(0), "ICController: IC token cannot be zero address");
        require(_icbtcToken != address(0), "ICController: ICBTC token cannot be zero address");
        require(_icautToken != address(0), "ICController: ICAUT token cannot be zero address");
        require(_oracle != address(0), "ICController: Oracle cannot be zero address");

        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Set contract references
        icToken = IIC(_icToken);
        icbtcToken = IReserveToken(_icbtcToken);
        icautToken = IReserveToken(_icautToken);
        oracle = IMockOracle(_oracle);
    }

    /**
     * @notice Grants KYC approval to a user
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE (admin now manages KYC directly)
     * @param _user Address to grant KYC approval to
     */
    function grantKyc(address _user) external onlyRole(RESERVE_MANAGER_ROLE) {
        require(_user != address(0), "ICController: Cannot grant KYC to zero address");
        
        isKycPassed[_user] = true;
        emit KycGranted(_user, msg.sender);
    }

    /**
     * @notice Revokes KYC approval from a user
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE (admin now manages KYC directly)
     * @param _user Address to revoke KYC approval from
     */
    function revokeKyc(address _user) external onlyRole(RESERVE_MANAGER_ROLE) {
        require(_user != address(0), "ICController: Cannot revoke KYC from zero address");
        require(isKycPassed[_user], "ICController: User not KYC approved");
        
        isKycPassed[_user] = false;
        emit KycRevoked(_user, msg.sender);
    }

    /**
     * @notice Grants KYC approval to multiple users in batch
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE
     * @param _users Array of addresses to grant KYC approval to
     */
    function batchGrantKyc(address[] calldata _users) external onlyRole(RESERVE_MANAGER_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            require(user != address(0), "ICController: Cannot grant KYC to zero address");
            
            if (!isKycPassed[user]) {
                isKycPassed[user] = true;
                emit KycGranted(user, msg.sender);
            }
        }
    }

    /**
     * @notice Pre-mints reserve tokens to build up reserve pools for future IC backing
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE
     * @dev Admin should call this periodically to maintain adequate reserves as real-world assets are acquired
     * @param _icbtcAmount Amount of ICBTC tokens to mint
     * @param _icautAmount Amount of ICAUT tokens to mint
     */
    function preMintReserves(uint256 _icbtcAmount, uint256 _icautAmount) external onlyRole(RESERVE_MANAGER_ROLE) {
        require(_icbtcAmount > 0 || _icautAmount > 0, "ICController: At least one amount must be greater than zero");

        if (_icbtcAmount > 0) {
            icbtcToken.mint(address(this), _icbtcAmount);
        }
        if (_icautAmount > 0) {
            icautToken.mint(address(this), _icautAmount);
        }

        emit ReserveTokensMinted(_icbtcAmount, _icautAmount, msg.sender);
    }

    /**
     * @notice Mints IC tokens backed by existing ICBTC and ICAUT reserves
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE
     * @dev Uses existing reserves that were pre-minted by admins
     * @param _to Address to mint IC tokens to
     * @param _icAmount Amount of IC tokens to mint
     */
    function mintBackedIc(address _to, uint256 _icAmount) external onlyRole(RESERVE_MANAGER_ROLE) nonReentrant {
        require(_to != address(0), "ICController: Cannot mint to zero address");
        require(_icAmount > 0, "ICController: Amount must be greater than zero");
        require(isKycPassed[_to], "ICController: Recipient not KYC approved");

        // Get current prices from oracle
        uint256 btcPrice = oracle.btcPrice();
        uint256 goldPrice = oracle.goldPrice();
        require(btcPrice > 0 && goldPrice > 0, "ICController: Invalid oracle prices");

        // Calculate USD value of IC tokens to mint (assuming 1 IC = 1 USD with 18 decimals)
        uint256 totalUsdValue = _icAmount; // 1:1 ratio for simplicity

        // Calculate required reserve amounts based on ratios
        uint256 icbtcUsdValue = (totalUsdValue * ICBTC_RESERVE_RATIO) / BASIS_POINTS;
        uint256 icautUsdValue = (totalUsdValue * ICAUT_RESERVE_RATIO) / BASIS_POINTS;

        // Convert USD values to token amounts (oracle prices are 8 decimals, convert to 18 decimals)
        uint256 icbtcAmount = (icbtcUsdValue * 1e18) / (btcPrice * 1e10);
        uint256 icautAmount = (icautUsdValue * 1e18) / (goldPrice * 1e10);

        // Check if we have sufficient available reserves (not already allocated to existing IC)
        uint256 totalIcbtcBalance = icbtcToken.balanceOf(address(this));
        uint256 totalIcautBalance = icautToken.balanceOf(address(this));
        
        // Calculate available reserves = Total balance - Already allocated reserves
        uint256 availableIcbtc = totalIcbtcBalance > totalIcbtcReserves ? totalIcbtcBalance - totalIcbtcReserves : 0;
        uint256 availableIcaut = totalIcautBalance > totalIcautReserves ? totalIcautBalance - totalIcautReserves : 0;
        
        require(availableIcbtc >= icbtcAmount, "ICController: Insufficient available ICBTC reserves");
        require(availableIcaut >= icautAmount, "ICController: Insufficient available ICAUT reserves");

        // Update reserve tracking (allocate existing reserves to back this IC)
        totalIcbtcReserves += icbtcAmount;
        totalIcautReserves += icautAmount;
        totalIcMinted += _icAmount;

        // Mint IC tokens to the recipient (will check if minting is frozen)
        icToken.mint(_to, _icAmount);

        emit IcMinted(_to, _icAmount, icbtcAmount, icautAmount);
    }

    /**
     * @notice Burns IC tokens and returns proportional reserves to the specified user
     * @dev Only callable by addresses with RESERVE_MANAGER_ROLE for proper IC token management
     * @param _from Address to burn IC tokens from
     * @param _icAmount Amount of IC tokens to burn
     */
    function burnIc(address _from, uint256 _icAmount) external onlyRole(RESERVE_MANAGER_ROLE) nonReentrant {
        require(_from != address(0), "ICController: Cannot burn from zero address");
        require(_icAmount > 0, "ICController: Amount must be greater than zero");
        require(isKycPassed[_from], "ICController: User not KYC approved");
        require(icToken.balanceOf(_from) >= _icAmount, "ICController: Insufficient IC balance");
        require(totalIcMinted >= _icAmount, "ICController: Cannot burn more than total minted");
        require(totalIcMinted > 0, "ICController: No IC tokens exist to burn against");

        // Calculate proportional reserve amounts to return
        uint256 icbtcToReturn = (totalIcbtcReserves * _icAmount) / totalIcMinted;
        uint256 icautToReturn = (totalIcautReserves * _icAmount) / totalIcMinted;

        // Update reserve tracking
        totalIcbtcReserves -= icbtcToReturn;
        totalIcautReserves -= icautToReturn;
        totalIcMinted -= _icAmount;

        // Burn IC tokens from user
        icToken.burnFrom(_from, _icAmount);

        // Transfer reserve tokens from contract to user (proper reserve redemption)
        if (icbtcToReturn > 0) {
            require(icbtcToken.balanceOf(address(this)) >= icbtcToReturn, "ICController: Insufficient ICBTC reserves in contract");
            // Burn from contract and mint to user (simulates transfer since we mint reserves to contract)
            icbtcToken.burnFrom(address(this), icbtcToReturn);
            icbtcToken.mint(_from, icbtcToReturn);
        }
        if (icautToReturn > 0) {
            require(icautToken.balanceOf(address(this)) >= icautToReturn, "ICController: Insufficient ICAUT reserves in contract");
            // Burn from contract and mint to user (simulates transfer since we mint reserves to contract)
            icautToken.burnFrom(address(this), icautToReturn);
            icautToken.mint(_from, icautToReturn);
        }

        emit IcBurned(_from, _icAmount, icbtcToReturn, icautToReturn);
    }

    /**
     * @notice Gets the current reserve ratios and total reserves
     * @return icbtcReserves Total ICBTC reserves allocated to backing IC
     * @return icautReserves Total ICAUT reserves allocated to backing IC
     * @return totalMinted Total IC tokens minted
     */
    function getReserveInfo() external view returns (
        uint256 icbtcReserves,
        uint256 icautReserves,
        uint256 totalMinted
    ) {
        return (totalIcbtcReserves, totalIcautReserves, totalIcMinted);
    }

    /**
     * @notice Gets available reserves that can be used for backing new IC tokens
     * @return availableIcbtc Available ICBTC reserves not yet allocated
     * @return availableIcaut Available ICAUT reserves not yet allocated
     */
    function getAvailableReserves() external view returns (
        uint256 availableIcbtc,
        uint256 availableIcaut
    ) {
        uint256 totalIcbtcBalance = icbtcToken.balanceOf(address(this));
        uint256 totalIcautBalance = icautToken.balanceOf(address(this));
        
        // Available = Total balance - Already allocated reserves
        availableIcbtc = totalIcbtcBalance > totalIcbtcReserves ? totalIcbtcBalance - totalIcbtcReserves : 0;
        availableIcaut = totalIcautBalance > totalIcautReserves ? totalIcautBalance - totalIcautReserves : 0;
        
        return (availableIcbtc, availableIcaut);
    }

    /**
     * @notice Gets the current reserve ratios
     * @return icbtcRatio ICBTC reserve ratio in basis points
     * @return icautRatio ICAUT reserve ratio in basis points
     * @return basisPoints Basis points denominator
     */
    function getReserveRatios() external pure returns (
        uint256 icbtcRatio,
        uint256 icautRatio,
        uint256 basisPoints
    ) {
        return (ICBTC_RESERVE_RATIO, ICAUT_RESERVE_RATIO, BASIS_POINTS);
    }

    /**
     * @notice Calculates the total USD value of reserves
     * @return Total USD value of all reserves
     */
    function getTotalReserveValue() public view returns (uint256) {
        uint256 btcPrice = oracle.btcPrice();
        uint256 goldPrice = oracle.goldPrice();
        
        // Add safety check for oracle prices
        require(btcPrice > 0 && goldPrice > 0, "ICController: Invalid oracle prices for reserve valuation");
        
        uint256 icbtcValue = (totalIcbtcReserves * btcPrice * 1e10) / 1e18;
        uint256 icautValue = (totalIcautReserves * goldPrice * 1e10) / 1e18;
        
        return icbtcValue + icautValue;
    }

    /**
     * @notice Calculates the current value of IC token based on reserves
     * @return Current IC token value in USD
     */
    function getCurrentIcValue() external view returns (uint256) {
        if (totalIcMinted == 0) {
            return 1e18; // Default to $1 if no tokens minted yet
        }
        
        uint256 totalReserveValue = getTotalReserveValue();
        return (totalReserveValue * 1e18) / totalIcMinted;
    }
}
