// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface to check KYC status from ICController
interface IICController {
    function isKycPassed(address user) external view returns (bool);
}

/**
 * @title IC
 * @dev International Credit main token backed by ICBTC and ICAUT
 * @notice Main IC token that represents the floating currency backed by Bitcoin and Gold
 */
contract IC is ERC20, ERC20Burnable, AccessControl, Pausable, ReentrancyGuard {
    /// @notice Role identifier for minting tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role identifier for burning tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    /// @notice Role identifier for emergency operations (requires 2 signatures)
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Reference to the ICController contract for KYC checks
    IICController public icController;
    
    /// @notice Multisig tracking for emergency operations
    mapping(bytes32 => uint256) public emergencySignatures;
    mapping(bytes32 => mapping(address => bool)) public hasSignedEmergency;
    
    /// @notice Required signatures for emergency operations
    uint256 public constant REQUIRED_EMERGENCY_SIGNATURES = 2;
    
    /// @notice Minting frozen state
    bool public mintingFrozen = false;

    /// @notice Emitted when ICController address is updated
    event ICControllerUpdated(address indexed oldController, address indexed newController);
    
    /// @notice Emitted when emergency operation is signed
    event EmergencyOperationSigned(bytes32 indexed operationHash, address indexed signer, uint256 signatures);
    
    /// @notice Emitted when emergency operation is executed
    event EmergencyOperationExecuted(bytes32 indexed operationHash, string operation);
    
    /// @notice Emitted when minting is frozen/unfrozen
    event MintingFrozen(address indexed by);
    event MintingUnfrozen(address indexed by);
    
    /// @notice Emitted when contract is emergency paused/unpaused
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

      modifier validNonce(uint256 _nonce) {
        require(_nonce == emergencyNonce + 1, "ICController: Invalid nonce");
        _;
        emergencyNonce++;
    }


    /**
     * @dev Constructor sets up roles and grants controller permissions
     * @param _icController Address of the ICController contract
     * @param _name Token name
     * @param _symbol Token symbol
     */
    constructor(
        address _icController,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Grant minter and burner roles to ICController
        if (_icController != address(0)) {
            _grantRole(MINTER_ROLE, _icController);
            _grantRole(BURNER_ROLE, _icController);
            icController = IICController(_icController);
        }
        
        // Grant emergency role to deployer (should be transferred to multisig addresses)
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    /**
     * @notice Sets the ICController contract address for KYC checks
     * @dev Only callable by admin
     * @param _icController Address of the ICController contract
     */
    function setICController(address _icController) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_icController != address(0), "IC: ICController cannot be zero address");
        address oldController = address(icController);
        icController = IICController(_icController);
        
        // Grant roles to new controller if not already granted
        if (!hasRole(MINTER_ROLE, _icController)) {
            _grantRole(MINTER_ROLE, _icController);
        }
        if (!hasRole(BURNER_ROLE, _icController)) {
            _grantRole(BURNER_ROLE, _icController);
        }
        
        emit ICControllerUpdated(oldController, _icController);
    }

    /**
     * @notice Mints tokens to a specified address
     * @dev Only callable by addresses with MINTER_ROLE when minting is not frozen
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenMintingNotFrozen {
        _mint(to, amount);
    }
    
    /**
     * @notice Modifier to check if minting is not frozen
     */
    modifier whenMintingNotFrozen() {
        require(!mintingFrozen, "IC: Minting is frozen");
        _;
    }

    /**
     * @notice Burns tokens from a specified address
     * @dev Only callable by addresses with BURNER_ROLE (typically ICController)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /**
     * @dev Override _update to enforce KYC checks on transfers and pause state
     * @param from Address tokens are being transferred from
     * @param to Address tokens are being transferred to
     * @param value Amount of tokens being transferred
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        // Skip KYC check for minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0) && address(icController) != address(0)) {
            require(icController.isKycPassed(from), "IC: Sender not KYC approved");
            require(icController.isKycPassed(to), "IC: Recipient not KYC approved");
        }
        
        super._update(from, to, value);
    }

    /**
     * @notice Emergency pause - requires 2 signatures from EMERGENCY_ROLE
     * @param nonce Unique nonce to prevent replay attacks
     */
    function emergencyPause(uint256 nonce) external onlyRole(EMERGENCY_ROLE) validNonce(nonce) {
        bytes32 operationHash = keccak256(abi.encodePacked("PAUSE", nonce, block.chainid));
        
        require(!hasSignedEmergency[operationHash][msg.sender], "IC: Already signed this operation");
        
        hasSignedEmergency[operationHash][msg.sender] = true;
        emergencySignatures[operationHash]++;
        
        emit EmergencyOperationSigned(operationHash, msg.sender, emergencySignatures[operationHash]);
        
        if (emergencySignatures[operationHash] >= REQUIRED_EMERGENCY_SIGNATURES) {
            _pause();
            emit EmergencyOperationExecuted(operationHash, "PAUSE");
            emit EmergencyPaused(msg.sender);
        }
    }
    
    /**
     * @notice Emergency unpause - requires 2 signatures from EMERGENCY_ROLE
     * @param nonce Unique nonce to prevent replay attacks
     */
    function emergencyUnpause(uint256 nonce) external onlyRole(EMERGENCY_ROLE) validNonce(nonce) {
        bytes32 operationHash = keccak256(abi.encodePacked("UNPAUSE", nonce, block.chainid));
        
        require(!hasSignedEmergency[operationHash][msg.sender], "IC: Already signed this operation");
        
        hasSignedEmergency[operationHash][msg.sender] = true;
        emergencySignatures[operationHash]++;
        
        emit EmergencyOperationSigned(operationHash, msg.sender, emergencySignatures[operationHash]);
        
        if (emergencySignatures[operationHash] >= REQUIRED_EMERGENCY_SIGNATURES) {
            _unpause();
            emit EmergencyOperationExecuted(operationHash, "UNPAUSE");
            emit EmergencyUnpaused(msg.sender);
        }
    }
    
    /**
     * @notice Freeze minting - requires 2 signatures from EMERGENCY_ROLE
     * @param nonce Unique nonce to prevent replay attacks
     */
    function freezeMinting(uint256 nonce) external onlyRole(EMERGENCY_ROLE) validNonce(nonce) {
        bytes32 operationHash = keccak256(abi.encodePacked("FREEZE_MINTING", nonce, block.chainid));
        
        require(!hasSignedEmergency[operationHash][msg.sender], "IC: Already signed this operation");
        
        hasSignedEmergency[operationHash][msg.sender] = true;
        emergencySignatures[operationHash]++;
        
        emit EmergencyOperationSigned(operationHash, msg.sender, emergencySignatures[operationHash]);
        
        if (emergencySignatures[operationHash] >= REQUIRED_EMERGENCY_SIGNATURES) {
            mintingFrozen = true;
            emit EmergencyOperationExecuted(operationHash, "FREEZE_MINTING");
            emit MintingFrozen(msg.sender);
        }
    }
    
    /**
     * @notice Unfreeze minting - requires 2 signatures from EMERGENCY_ROLE
     * @param nonce Unique nonce to prevent replay attacks
     */
    function unfreezeMinting(uint256 nonce) external onlyRole(EMERGENCY_ROLE) validNonce(nonce) {
        bytes32 operationHash = keccak256(abi.encodePacked("UNFREEZE_MINTING", nonce, block.chainid));
        
        require(!hasSignedEmergency[operationHash][msg.sender], "IC: Already signed this operation");
        
        hasSignedEmergency[operationHash][msg.sender] = true;
        emergencySignatures[operationHash]++;
        
        emit EmergencyOperationSigned(operationHash, msg.sender, emergencySignatures[operationHash]);
        
        if (emergencySignatures[operationHash] >= REQUIRED_EMERGENCY_SIGNATURES) {
            mintingFrozen = false;
            emit EmergencyOperationExecuted(operationHash, "UNFREEZE_MINTING");
            emit MintingUnfrozen(msg.sender);
        }
    }
    
    /**
     * @notice Emergency burn tokens from any address - requires 2 signatures from EMERGENCY_ROLE
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param nonce Unique nonce to prevent replay attacks
     */
    function emergencyBurn(address from, uint256 amount, uint256 nonce) external onlyRole(EMERGENCY_ROLE) validNonce(nonce) nonReentrant {
        bytes32 operationHash = keccak256(abi.encodePacked("EMERGENCY_BURN", from, amount, nonce, block.chainid));
        
        require(!hasSignedEmergency[operationHash][msg.sender], "IC: Already signed this operation");
        
        hasSignedEmergency[operationHash][msg.sender] = true;
        emergencySignatures[operationHash]++;
        
        emit EmergencyOperationSigned(operationHash, msg.sender, emergencySignatures[operationHash]);
        
        if (emergencySignatures[operationHash] >= REQUIRED_EMERGENCY_SIGNATURES) {
            _burn(from, amount);
            emit EmergencyOperationExecuted(operationHash, "EMERGENCY_BURN");
        }
    }
    
    /**
     * @notice Get emergency operation signature count
     * @param operationHash Hash of the emergency operation
     * @return Number of signatures for the operation
     */
    function getEmergencySignatures(bytes32 operationHash) external view returns (uint256) {
        return emergencySignatures[operationHash];
    }
    
    /**
     * @notice Check if address has signed an emergency operation
     * @param operationHash Hash of the emergency operation
     * @param signer Address to check
     * @return True if the address has signed the operation
     */
    function hasSignedEmergencyOperation(bytes32 operationHash, address signer) external view returns (bool) {
        return hasSignedEmergency[operationHash][signer];
    }
    
    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
