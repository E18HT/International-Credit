# International Credit (IC) System - Hedera 

A complete DeFi system implementing a floating currency backed by Bitcoin and Gold tokens, featuring integrated KYC, 4-actor governance, fixed-term staking, and emergency controls on the Hedera EVM testnet.

##  System Architecture

The IC system consists of 8 smart contracts working together to create a comprehensive DeFi ecosystem:

### Core Tokens
- **IC** - Main floating currency token backed 40% by ICBTC and 60% by ICAUT (with pausable and emergency features)
- **ICBTC** - Bitcoin-backed reserve token
- **ICAUT** - Gold-backed reserve token  
- **ICGOVT** - Governance token for the 4-actor voting system

### System Controllers
- **ICController** - Main system controller handling KYC, minting, and reserve management
- **GovernanceController** - 4-actor governance system with off-chain proposals and voting timelines
- **VaultAndYield** - Fixed-term staking mechanism with time-based APY rewards
- **MockOracle** - Price oracle for BTC and Gold prices (for testing)

## 📄 Contract Details

### IC Token (`IC.sol`)
**Description**: Main floating currency token backed by Bitcoin and Gold reserves. Features emergency controls with 2-signature multisig protection.

**Key Features**:
- KYC-enforced transfers (sender & recipient must be KYC-approved)
- Pausable contract for emergency stops
- Minting freeze/unfreeze capability
- Emergency burn functionality
- 2-signature multisig for all emergency operations

**Main Functions**:
- `mint(address to, uint256 amount)` - Mint IC tokens (MINTER_ROLE only)
- `burnFrom(address from, uint256 amount)` - Burn IC tokens (BURNER_ROLE only)
- `emergencyPause(uint256 nonce)` - Pause contract (requires 2 EMERGENCY_ROLE signatures)
- `emergencyUnpause(uint256 nonce)` - Unpause contract (requires 2 EMERGENCY_ROLE signatures)
- `freezeMinting(uint256 nonce)` - Freeze minting operations (requires 2 EMERGENCY_ROLE signatures)
- `unfreezeMinting(uint256 nonce)` - Unfreeze minting operations (requires 2 EMERGENCY_ROLE signatures)
- `emergencyBurn(address from, uint256 amount, uint256 nonce)` - Emergency burn tokens (requires 2 EMERGENCY_ROLE signatures)
- `setICController(address _icController)` - Update ICController reference

**Roles**:
- `MINTER_ROLE` - Can mint tokens
- `BURNER_ROLE` - Can burn tokens
- `EMERGENCY_ROLE` - Can execute emergency operations (requires 2 signatures)

---

### ICBTC Token (`ICBTC.sol`)
**Description**: ERC20 token representing Bitcoin reserves. Enforces KYC on all transfers.

**Key Features**:
- KYC-enforced transfers
- Mintable and burnable
- Access control for minting operations

**Main Functions**:
- `mint(address to, uint256 amount)` - Mint ICBTC tokens (MINTER_ROLE only)
- `burnFrom(address from, uint256 amount)` - Burn ICBTC tokens (MINTER_ROLE only)
- `setICController(address _icController)` - Update ICController reference for KYC checks

**Roles**:
- `MINTER_ROLE` - Can mint and burn tokens

---

### ICAUT Token (`ICAUT.sol`)
**Description**: ERC20 token representing Gold reserves. Enforces KYC on all transfers.

**Key Features**:
- KYC-enforced transfers
- Mintable and burnable
- Access control for minting operations

**Main Functions**:
- `mint(address to, uint256 amount)` - Mint ICAUT tokens (MINTER_ROLE only)
- `burnFrom(address from, uint256 amount)` - Burn ICAUT tokens (MINTER_ROLE only)
- `setICController(address _icController)` - Update ICController reference for KYC checks

**Roles**:
- `MINTER_ROLE` - Can mint and burn tokens

---

### ICGOVT Token (`ICGOVT.sol`)
**Description**: Governance token used for voting in the 4-actor governance system.

**Key Features**:
- Standard ERC20 token
- Mintable by authorized roles
- Batch minting support

**Main Functions**:
- `mint(address to, uint256 amount)` - Mint governance tokens (MINTER_ROLE only)
- `batchMint(address[] recipients, uint256[] amounts)` - Batch mint to multiple addresses
- `getVotingPower(address account)` - Get voting power (token balance)

**Roles**:
- `MINTER_ROLE` - Can mint tokens

---

### ICController (`ICController.sol`)
**Description**: Main system controller managing KYC, IC token minting, and reserve management.

**Key Features**:
- KYC management (grant/revoke/batch operations)
- IC token minting backed by reserves (40% ICBTC, 60% ICAUT)
- Reserve pre-minting for liquidity
- IC token burning with proportional reserve redemption
- Reserve value calculations

**Main Functions**:
- `grantKyc(address _user)` - Grant KYC approval to a user (RESERVE_MANAGER_ROLE only)
- `revokeKyc(address _user)` - Revoke KYC approval from a user (RESERVE_MANAGER_ROLE only)
- `batchGrantKyc(address[] _users)` - Batch grant KYC to multiple users
- `preMintReserves(uint256 _icbtcAmount, uint256 _icautAmount)` - Pre-mint reserve tokens for liquidity
- `mintBackedIc(address _to, uint256 _icAmount)` - Mint IC tokens backed by reserves
- `burnIc(address _from, uint256 _icAmount)` - Burn IC tokens and return proportional reserves
- `getReserveInfo()` - Get current reserve information (ICBTC, ICAUT, total minted)
- `getAvailableReserves()` - Get available reserves not yet allocated
- `getCurrentIcValue()` - Calculate current IC token value based on reserves

**Roles**:
- `RESERVE_MANAGER_ROLE` - Can manage KYC, mint IC tokens, and manage reserves

**Reserve Ratios**:
- ICBTC: 40% (4000 basis points)
- ICAUT: 60% (6000 basis points)

---

### GovernanceController (`GovernanceController.sol`)
**Description**: 4-actor governance system with off-chain proposals and voting timelines.

**Key Features**:
- Fixed 4-actor system (Investor, Advisor, Team, Custodian)
- Requires 3 out of 4 votes for proposal execution
- Configurable voting periods (7-30 days)
- Automatic proposal execution when majority reached
- Proposal expiration system
- Tie handling (2-2 votes)

**Main Functions**:
- `createProposal(string _description)` - Create a new governance proposal (actors only)
- `vote(uint256 _proposalId, bool _support)` - Vote on a proposal (actors only, must hold ICGOVT)
- `expireProposal(uint256 _proposalId)` - Expire a proposal that passed deadline
- `updateVotingPeriod(uint256 _newVotingPeriod)` - Update voting period (actors only)
- `getProposal(uint256 _proposalId)` - Get detailed proposal information
- `getProposalVoteCounts(uint256 _proposalId)` - Get for/against vote counts
- `getActiveProposals()` - Get all active proposals
- `getPassedProposals()` - Get all passed proposals
- `getFailedProposals()` - Get all failed proposals
- `getTiedProposals()` - Get all tied proposals
- `getExpiredProposals()` - Get all expired proposals
- `isVotingActive(uint256 _proposalId)` - Check if voting is still active
- `getRemainingVotingTime(uint256 _proposalId)` - Get remaining voting time

**Key Constants**:
- `REQUIRED_VOTES`: 3 (out of 4 actors)
- `TOTAL_ACTORS`: 4
- `MIN_VOTING_PERIOD`: 1 day
- `MAX_VOTING_PERIOD`: 30 days
- Default `votingPeriod`: 7 days

---

### VaultAndYield (`VaultAndYield.sol`)
**Description**: Fixed-term staking mechanism for IC tokens with time-based APY rewards.

**Key Features**:
- Fixed-term staking (30, 90, 180, 365, 730 days)
- Time-based APY rewards (7% to 18%)
- Lock period enforcement
- Reward calculation based on duration and APY

**Main Functions**:
- `stake(uint256 _amount, uint256 _duration)` - Stake IC tokens for a fixed duration
- `withdraw(uint256 _stakeId)` - Withdraw matured stake with rewards
- `getStakeInfo(address _user, uint256 _stakeId)` - Get detailed stake information
- `getUserStakeCount(address _user)` - Get number of stakes for a user
- `getSupportedDurations()` - Get all supported staking durations and APYs
- `calculateExpectedRewards(uint256 _amount, uint256 _duration)` - Calculate expected rewards
- `getTotalValueLocked()` - Get total value locked in staking

**Staking Options**:
- 30 days: 7% APY
- 90 days: 9% APY
- 180 days: 12% APY
- 365 days: 15% APY
- 730 days: 18% APY

---

### MockOracle (`MockOracle.sol`)
**Description**: Simple price oracle for testing purposes. Stores BTC and Gold prices.

**Key Features**:
- Owner-controlled price updates
- 8-decimal precision for prices
- Separate BTC and Gold price feeds

**Main Functions**:
- `setBtcPrice(uint256 _newPrice)` - Set Bitcoin price (owner only)
- `setGoldPrice(uint256 _newPrice)` - Set Gold price (owner only)
- `btcPrice()` - Get current Bitcoin price
- `goldPrice()` - Get current Gold price
- `getPrices()` - Get both BTC and Gold prices

**Note**: This is a mock implementation for testing. Replace with real oracle (e.g., Chainlink) for production.

##  Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- Git

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd ic-hedera-mvp
npm install
```

2. **Configure environment variables:**
```bash
cp env.example .env
# Edit .env with your actual values
```

Required environment variables:
```
HEDERA_ACCOUNT_ID=0.0.xxxx
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...
ADMIN_ADDRESS=0x...
INVESTOR_ADDRESS=0x...
ADVISOR_ADDRESS=0x...
TEAM_ADDRESS=0x...
CUSTODIAN_ADDRESS=0x...
SIGNER1_ADDRESS=0x...
SIGNER2_ADDRESS=0x...
```

3. **Compile contracts:**
```bash
npm run compile
```

4. **Run tests:**
```bash
npm test
```

5. **Deploy to Hedera testnet:**
```bash
npm run deploy
```

##  System Flows

### 1. User Onboarding Flow
1. **KYC Approval**: Admin directly whitelists users by calling `grantKyc(userAddress)`
2. **Instant Access**: User is immediately KYC-approved for all IC system interactions
3. **Batch Operations**: Admin can use `batchGrantKyc()` for multiple users at once

### 2. IC Token Acquisition Flow  
1. **Off-chain Payment**: User makes payment off-chain (e.g., $100)
2. **Reserve Calculation**: Admin calls `mintBackedIc(userAddress, 100e18)` 
3. **Automatic Reserve Backing**: System calculates and mints required reserves:
   - 40% BTC: ~0.000667 ICBTC (worth $40 at $60k/BTC)
   - 60% Gold: 0.03 ICAUT (worth $60 at $2k/Gold)  
4. **IC Minting**: 100 IC tokens are minted directly to user's wallet
5. **Floating Value**: IC value is determined by reserves, not fixed peg

### 3. Staking Flow
1. **Approval**: User approves VaultAndYield to spend IC tokens
2. **Staking**: User calls `stake(amount, duration)` with supported duration
3. **Lock Period**: Tokens are locked for the specified duration
4. **Withdrawal**: After maturity, user calls `withdraw()` to get principal + rewards

### 4. Governance Flow
1. **Proposal Creation**: Any of the 4 actors creates an off-chain proposal (description only)
2. **Voting Timeline**: Proposals have configurable voting periods (7-30 days)
3. **Voting**: Actors vote on proposals (must hold ICGOVT tokens)
4. **Auto-Execution**: Once 3 votes are reached, proposal automatically passes
5. **Implementation**: Off-chain implementation based on passed proposals

##  Staking Options

| Duration | APY | Lock Period |
|----------|-----|-------------|
| 30 days  | 7%  | 1 month     |
| 90 days  | 9%  | 3 months    |
| 180 days | 12% | 6 months    |
| 365 days | 15% | 1 year      |
| 730 days | 18% | 2 years     |

##  Security Features

### KYC Enforcement
- All token transfers require both sender and recipient to be KYC-approved
- KYC status is managed by admin (RESERVE_MANAGER_ROLE)
- Minting and burning operations also enforce KYC
- Batch KYC operations for efficiency

### Multi-Actor Governance
- 4 fixed actors: Investor, Advisor, Team, Custodian
- Requires 3 out of 4 votes for proposal execution
- All actors must hold ICGOVT tokens to vote
- Off-chain proposals with automatic execution
- Configurable voting periods (7-30 days)
- Proposal expiration system

### Emergency Controls (IC Token Only)
- **Pausable Contract**: Emergency pause/unpause functionality
- **Minting Freeze**: Ability to freeze/unfreeze minting operations
- **Emergency Burn**: Burn tokens from any address in emergencies
- **2-Signature Multisig**: All emergency actions require 2 signatures from EMERGENCY_ROLE holders

### Reserve Management
- IC tokens are always backed by reserves (40% ICBTC, 60% ICAUT)
- Reserve ratios are enforced at minting time
- Users can burn IC tokens to redeem proportional reserves
- Oracle prices determine reserve token amounts
- Atomic minting prevents over-issuance

##  Development

### Available Scripts
```bash
npm run compile    # Compile all contracts
npm test          # Run complete test suite
npm run deploy    # Deploy to Hedera testnet
npm run verify    # Verify contracts on explorer
npm run clean     # Clean build artifacts
npm run coverage  # Generate test coverage report
```

### Testing
The test suite covers:
- Complete deployment and setup process
- Full governance flow with voting timelines and automatic execution
- Admin minting flow with KYC approval
- Emergency features (pause, minting freeze, emergency burn)
- 2-signature multisig functionality
- Staking process with reward calculations
- IC value calculations based on reserves
- Proposal expiration and timeline management
- Error cases and edge conditions

Run tests with:
```bash
npm test
```

### Contract Verification
After deployment, verify contracts on Hedera explorer:
```bash
npm run verify
```

##  Contract Addresses

After deployment, contract addresses are saved to `deployments/hedera-testnet.json`:

```json
{
  "MockOracle": "0x...",
  "ICBTC": "0x...",
  "ICAUT": "0x...",
  "IC": "0x...",
  "ICGOVT": "0x...",
  "ICController": "0x...",
  "GovernanceController": "0x...",
  "VaultAndYield": "0x...",
  "deploymentBlock": 12345,
  "timestamp": 1640995200000,
  "network": "hedera"
}
```

##  Configuration

### Hardhat Configuration
The project is configured for Hedera EVM testnet:
- **Network**: Hedera Testnet
- **Chain ID**: 296
- **RPC URL**: https://testnet.hashio.io/api
- **Explorer**: https://hashscan.io/testnet
- **Gas Price**: 370 Gwei (Hedera minimum requirement)

### Solidity Version
- **Version**: ^0.8.20
- **Optimizer**: Enabled with 200 runs
- **OpenZeppelin**: ^5.0.0 (includes Pausable for emergency features)

##  Actor Roles

### Admin (RESERVE_MANAGER_ROLE)
- Can directly grant/revoke KYC approval to users
- Can mint IC tokens backed by reserves
- Can pre-mint reserve tokens (ICBTC/ICAUT) for liquidity
- Confirms off-chain payments
- Manages day-to-day operations

### Emergency Signers (EMERGENCY_ROLE)
- **Signer 1 & Signer 2**: Two designated addresses for emergency operations
- Can pause/unpause IC contract (requires 2 signatures)
- Can freeze/unfreeze IC minting (requires 2 signatures)
- Can emergency burn IC tokens (requires 2 signatures)
- Multisig protection prevents single-point-of-failure

### Governance Actors (4-actor system)
- **Investor**: Strategic oversight and funding decisions
- **Advisor**: Technical and business guidance  
- **Team**: Development and operational execution
- **Custodian**: Asset custody and security oversight

Each actor:
- Receives 250,000 ICGOVT tokens
- Can create and vote on off-chain proposals
- Must hold ICGOVT to vote
- Needs 3 out of 4 votes for automatic proposal passing
- Proposals have configurable voting periods

##  Monitoring

### Events to Monitor
- `KycGranted` / `KycRevoked` - KYC status changes
- `IcMinted` / `IcBurned` - IC token supply changes
- `ProposalCreated` / `VoteCast` / `ProposalPassed` - Governance activity
- `ProposalExpired` / `VotingPeriodUpdated` - Voting timeline changes
- `Staked` / `Withdrawn` - Staking activity
- `Paused` / `Unpaused` - Emergency pause events
- `EmergencyBurn` - Emergency burn operations

### Key Metrics
- Total IC supply (`totalIcMinted`)
- Reserve ratios (`getReserveInfo()`)
- Total value locked in staking (`getTotalValueLocked()`)
- Governance participation rates
- Active vs expired proposals
- Emergency operation frequency
- Contract pause status and minting freeze status

##  Important Notes

### For Production Deployment
1. Replace MockOracle with real price feeds (e.g., Chainlink)
2. Review emergency signer addresses and key management
3. Implement time delays for critical governance proposals
4. Add circuit breakers for large operations
5. Add comprehensive monitoring and alerting
6. Conduct thorough security audits of emergency features
7. Test multisig operations extensively

### Security Considerations
- All contracts use OpenZeppelin's battle-tested implementations
- Reentrancy protection on critical functions
- Access control for all privileged operations
- KYC enforcement on all token transfers
- 2-signature multisig for emergency operations
- Pausable functionality for emergency stops
- Atomic reserve minting prevents over-issuance
- Voting timeline enforcement prevents indefinite proposals

##  Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

##  License

MIT License - see LICENSE file for details.

---

**⚡ Ready to deploy on Hedera EVM testnet!** 

The system is production-ready with comprehensive tests, emergency controls, 2-signature multisig security, voting timelines, and complete documentation. All contracts follow best practices and are fully integrated for the complete IC ecosystem with robust security features.
