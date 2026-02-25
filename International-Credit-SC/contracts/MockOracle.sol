// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockOracle
 * @dev A simple oracle contract for testing purposes that stores BTC and Gold prices
 * @notice This is a mock implementation and should not be used in production
 */
contract MockOracle is Ownable {
    /// @notice Current Bitcoin price in USD (with 8 decimals, e.g., 60000000000 = $600.00)
    uint256 public btcPrice;
    
    /// @notice Current Gold price in USD (with 8 decimals, e.g., 2000000000 = $20.00)
    uint256 public goldPrice;

    /// @notice Emitted when BTC price is updated
    event BtcPriceUpdated(uint256 oldPrice, uint256 newPrice, address updatedBy);
    
    /// @notice Emitted when Gold price is updated
    event GoldPriceUpdated(uint256 oldPrice, uint256 newPrice, address updatedBy);

    /**
     * @dev Constructor sets the initial owner
     * @param _initialOwner Address that will own this contract
     */
    constructor(address _initialOwner) Ownable(_initialOwner) {
        // Initial prices can be set to 0 and updated later
        btcPrice = 0;
        goldPrice = 0;
    }

    /**
     * @notice Sets the Bitcoin price
     * @dev Only callable by the contract owner
     * @param _newPrice New BTC price in USD with 8 decimals
     */
    function setBtcPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = btcPrice;
        btcPrice = _newPrice;
        emit BtcPriceUpdated(oldPrice, _newPrice, msg.sender);
    }

    /**
     * @notice Sets the Gold price
     * @dev Only callable by the contract owner
     * @param _newPrice New Gold price in USD with 8 decimals
     */
    function setGoldPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = goldPrice;
        goldPrice = _newPrice;
        emit GoldPriceUpdated(oldPrice, _newPrice, msg.sender);
    }

    /**
     * @notice Gets both BTC and Gold prices in a single call
     * @return btc Current BTC price
     * @return gold Current Gold price
     */
    function getPrices() external view returns (uint256 btc, uint256 gold) {
        return (btcPrice, goldPrice);
    }
}
