// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Interface to check KYC status from ICController
interface IICController {
    function isKycPassed(address user) external view returns (bool);
}

/**
 * @title ICAUT
 * @dev International Credit Gold Backed Token
 * @notice ERC20 token representing Gold reserves in the IC system
 */
contract ICAUT is ERC20, ERC20Burnable, AccessControl {
    /// @notice Role identifier for minting tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Reference to the ICController contract for KYC checks
    IICController public icController;

    /// @notice Emitted when ICController address is updated
    event ICControllerUpdated(address indexed oldController, address indexed newController);

    /**
     * @dev Constructor mints initial supply and sets up roles
     * @param _initialSupply Initial token supply to mint to deployer
     * @param _name Token name
     * @param _symbol Token symbol
     */
    constructor(
        uint256 _initialSupply,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        // Grant roles to the deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply to deployer
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }

    /**
     * @notice Sets the ICController contract address for KYC checks
     * @dev Only callable by admin
     * @param _icController Address of the ICController contract
     */
    function setICController(address _icController) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_icController != address(0), "ICAUT: ICController cannot be zero address");
        address oldController = address(icController);
        icController = IICController(_icController);
        emit ICControllerUpdated(oldController, _icController);
    }

    /**
     * @notice Mints tokens to a specified address
     * @dev Only callable by addresses with MINTER_ROLE
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Burns tokens from a specified address
     * @dev Only callable by addresses with MINTER_ROLE (same role for consistency)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    /**
     * @dev Override _update to enforce KYC checks on transfers
     * @param from Address tokens are being transferred from
     * @param to Address tokens are being transferred to
     * @param value Amount of tokens being transferred
     */
    function _update(address from, address to, uint256 value) internal override {
        // Skip KYC check for minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0) && address(icController) != address(0)) {
            require(icController.isKycPassed(from), "ICAUT: Sender not KYC approved");
            require(icController.isKycPassed(to), "ICAUT: Recipient not KYC approved");
        }
        
        super._update(from, to, value);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
