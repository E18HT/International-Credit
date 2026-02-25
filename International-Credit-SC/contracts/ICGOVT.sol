// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ICGOVT
 * @dev International Credit Governance Token
 * @notice ERC20 token used for governance voting in the IC system
 */
contract ICGOVT is ERC20, AccessControl {
    /// @notice Role identifier for minting tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Emitted when tokens are minted for governance purposes
    event GovernanceTokensMinted(address indexed to, uint256 amount, address indexed minter);

    /**
     * @dev Constructor sets up roles
     * @param _name Token name
     * @param _symbol Token symbol
     */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        // Grant roles to the deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mints governance tokens to a specified address
     * @dev Only callable by addresses with MINTER_ROLE
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "ICGOVT: Cannot mint to zero address");
        require(amount > 0, "ICGOVT: Amount must be greater than zero");
        
        _mint(to, amount);
        emit GovernanceTokensMinted(to, amount, msg.sender);
    }

    /**
     * @notice Batch mint governance tokens to multiple addresses
     * @dev Only callable by addresses with MINTER_ROLE
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each recipient
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE) 
    {
        require(recipients.length == amounts.length, "ICGOVT: Arrays length mismatch");
        require(recipients.length > 0, "ICGOVT: Empty arrays");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "ICGOVT: Cannot mint to zero address");
            require(amounts[i] > 0, "ICGOVT: Amount must be greater than zero");
            
            _mint(recipients[i], amounts[i]);
            emit GovernanceTokensMinted(recipients[i], amounts[i], msg.sender);
        }
    }

    /**
     * @notice Gets the voting power of an address
     * @dev Voting power is equal to token balance
     * @param account Address to check voting power for
     * @return Voting power (token balance)
     */
    function getVotingPower(address account) external view returns (uint256) {
        return balanceOf(account);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
