import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  MockOracle,
  ICBTC,
  ICAUT,
  IC,
  ICGOVT,
  ICController,
  GovernanceController,
  VaultAndYield
} from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("IC System Integration Tests", function () {
  // Contract instances
  let mockOracle: MockOracle;
  let icbtc: ICBTC;
  let icaut: ICAUT;
  let ic: IC;
  let icgovt: ICGOVT;
  let icController: ICController;
  let governanceController: GovernanceController;
  let vaultAndYield: VaultAndYield;

  // Signers
  let deployer: SignerWithAddress;
  let admin: SignerWithAddress;
  let investor: SignerWithAddress;
  let advisor: SignerWithAddress;
  let team: SignerWithAddress;
  let custodian: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Constants
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const GOVERNANCE_AMOUNT = ethers.parseEther("250000");
  const BTC_PRICE = ethers.parseUnits("60000", 8); // $60,000
  const GOLD_PRICE = ethers.parseUnits("2000", 8); // $2,000

  beforeEach(async function () {
    // Get signers
    [deployer, admin, investor, advisor, team, custodian, user1, user2] = await ethers.getSigners();

    // Deploy MockOracle
    const MockOracleFactory = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracleFactory.deploy(deployer.address);

    // Deploy ICBTC
    const ICBTCFactory = await ethers.getContractFactory("ICBTC");
    icbtc = await ICBTCFactory.deploy(
      INITIAL_SUPPLY,
      "International Credit Bitcoin Backed Token",
      "ICBTC"
    );

    // Deploy ICAUT
    const ICAUTFactory = await ethers.getContractFactory("ICAUT");
    icaut = await ICAUTFactory.deploy(
      INITIAL_SUPPLY,
      "International Credit Gold Backed Token",
      "ICAUT"
    );

    // Deploy IC
    const ICFactory = await ethers.getContractFactory("IC");
    ic = await ICFactory.deploy(
      ethers.ZeroAddress, // Will be set later
      "International Credit",
      "IC"
    );

    // Deploy ICGOVT
    const ICGOVTFactory = await ethers.getContractFactory("ICGOVT");
    icgovt = await ICGOVTFactory.deploy(
      "International Credit Governance Token",
      "ICGOVT"
    );

    // Deploy ICController
    const ICControllerFactory = await ethers.getContractFactory("ICController");
    icController = await ICControllerFactory.deploy(
      await ic.getAddress(),
      await icbtc.getAddress(),
      await icaut.getAddress(),
      await mockOracle.getAddress()
    );

    // Deploy GovernanceController
    const GovernanceControllerFactory = await ethers.getContractFactory("GovernanceController");
    governanceController = await GovernanceControllerFactory.deploy(
      investor.address,
      advisor.address,
      team.address,
      custodian.address,
      await icgovt.getAddress()
    );

    // Deploy VaultAndYield
    const VaultAndYieldFactory = await ethers.getContractFactory("VaultAndYield");
    vaultAndYield = await VaultAndYieldFactory.deploy(await ic.getAddress());

    // Setup roles and permissions
    await setupRolesAndPermissions();

    // Set initial oracle prices (before transferring ownership)
    await mockOracle.setBtcPrice(BTC_PRICE);
    await mockOracle.setGoldPrice(GOLD_PRICE);

    // Transfer oracle ownership to governance (after setting initial prices)
    await mockOracle.transferOwnership(await governanceController.getAddress());

    // Mint governance tokens
    await mintGovernanceTokens();
  });

  async function setupRolesAndPermissions() {
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const COMPLIANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_ROLE"));
    const RESERVE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESERVE_MANAGER_ROLE"));

    // Set ICController in tokens
    await ic.setICController(await icController.getAddress());
    await icbtc.setICController(await icController.getAddress());
    await icaut.setICController(await icController.getAddress());

    // Grant roles to ICController
    await icbtc.grantRole(MINTER_ROLE, await icController.getAddress());
    await icaut.grantRole(MINTER_ROLE, await icController.getAddress());

    // Grant roles - Admin now manages KYC directly
    await icController.grantRole(RESERVE_MANAGER_ROLE, admin.address);

    // Pre-mint sufficient reserves for testing (equivalent to backing $10M worth of IC tokens)
    const reserveAmount = ethers.parseEther("10000000"); // $10M worth
    
    // Calculate required ICBTC and ICAUT amounts based on prices and ratios
    // 40% ICBTC: $4M / $60,000 = ~66.67 ICBTC
    // 60% ICAUT: $6M / $2,000 = 3000 ICAUT
    const icbtcReserveAmount = (reserveAmount * 4000n * BigInt(1e18)) / (10000n * BTC_PRICE);
    const icautReserveAmount = (reserveAmount * 6000n * BigInt(1e18)) / (10000n * GOLD_PRICE);
    
    await icController.connect(admin).preMintReserves(icbtcReserveAmount, icautReserveAmount);
  }

  async function mintGovernanceTokens() {
    await icgovt.mint(investor.address, GOVERNANCE_AMOUNT);
    await icgovt.mint(advisor.address, GOVERNANCE_AMOUNT);
    await icgovt.mint(team.address, GOVERNANCE_AMOUNT);
    await icgovt.mint(custodian.address, GOVERNANCE_AMOUNT);
  }

  describe("1. Complete Deployment and Setup", function () {
    it("Should deploy all contracts with correct initial states", async function () {
      // Check token deployments
      expect(await icbtc.name()).to.equal("International Credit Bitcoin Backed Token");
      expect(await icbtc.symbol()).to.equal("ICBTC");
      expect(await icbtc.totalSupply()).to.be.greaterThan(INITIAL_SUPPLY); // Includes pre-minted reserves

      expect(await icaut.name()).to.equal("International Credit Gold Backed Token");
      expect(await icaut.symbol()).to.equal("ICAUT");
      expect(await icaut.totalSupply()).to.be.greaterThan(INITIAL_SUPPLY); // Includes pre-minted reserves

      expect(await ic.name()).to.equal("International Credit");
      expect(await ic.symbol()).to.equal("IC");

      expect(await icgovt.name()).to.equal("International Credit Governance Token");
      expect(await icgovt.symbol()).to.equal("ICGOVT");

      // Check oracle prices
      expect(await mockOracle.btcPrice()).to.equal(BTC_PRICE);
      expect(await mockOracle.goldPrice()).to.equal(GOLD_PRICE);

      // Check governance token distribution
      expect(await icgovt.balanceOf(investor.address)).to.equal(GOVERNANCE_AMOUNT);
      expect(await icgovt.balanceOf(advisor.address)).to.equal(GOVERNANCE_AMOUNT);
      expect(await icgovt.balanceOf(team.address)).to.equal(GOVERNANCE_AMOUNT);
      expect(await icgovt.balanceOf(custodian.address)).to.equal(GOVERNANCE_AMOUNT);
    });

    it("Should have correct role assignments", async function () {
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
      const COMPLIANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_ROLE"));
      const RESERVE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESERVE_MANAGER_ROLE"));

      // Check ICController has minter roles on reserve tokens
      expect(await icbtc.hasRole(MINTER_ROLE, await icController.getAddress())).to.be.true;
      expect(await icaut.hasRole(MINTER_ROLE, await icController.getAddress())).to.be.true;

      // Check admin has reserve manager role (now includes KYC management)
      expect(await icController.hasRole(RESERVE_MANAGER_ROLE, admin.address)).to.be.true;
    });
  });

  describe("2. Governance Flow: Proposal Creation, Voting, and Execution", function () {
    it("Should demonstrate admin direct KYC management", async function () {
      // Admin can directly grant KYC (no governance needed for KYC)
      await expect(icController.connect(admin).grantKyc(user1.address))
        .to.emit(icController, "KycGranted")
        .withArgs(user1.address, admin.address);

      // Verify KYC was granted
      expect(await icController.isKycPassed(user1.address)).to.be.true;

      // Admin can also revoke KYC
      await expect(icController.connect(admin).revokeKyc(user1.address))
        .to.emit(icController, "KycRevoked")
        .withArgs(user1.address, admin.address);

      expect(await icController.isKycPassed(user1.address)).to.be.false;

      // Re-grant for other tests
      await icController.connect(admin).grantKyc(user1.address);
    });

    it("Should support batch KYC operations", async function () {
      const users = [user1.address, user2.address];
      
      // Admin can batch grant KYC
      await expect(icController.connect(admin).batchGrantKyc(users))
        .to.emit(icController, "KycGranted")
        .withArgs(user2.address, admin.address); // user1 already has KYC

      // Verify both users have KYC
      expect(await icController.isKycPassed(user1.address)).to.be.true;
      expect(await icController.isKycPassed(user2.address)).to.be.true;
    });

    it("Should complete governance flow with automatic execution", async function () {
      // Create proposal (no function data needed)
      await expect(governanceController.connect(advisor).createProposal(
        "Update BTC price to $65,000 for better market alignment"
      ))
        .to.emit(governanceController, "ProposalCreated")
        .withArgs(0, advisor.address, "Update BTC price to $65,000 for better market alignment");

      // Check initial proposal state
      let proposal = await governanceController.getProposal(0);
      expect(proposal.proposer).to.equal(advisor.address);
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.passed).to.equal(false);
      expect(proposal.passedAt).to.equal(0);

      // First vote
      await expect(governanceController.connect(investor).vote(0, true))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, investor.address, true);

      // Second vote
      await expect(governanceController.connect(advisor).vote(0, true))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, advisor.address, true);

      // Third vote should trigger automatic execution
      await expect(governanceController.connect(team).vote(0, true))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, team.address, true)
        .and.to.emit(governanceController, "ProposalPassed")
        .withArgs(0, team.address, 3);

      // Verify proposal is automatically passed
      proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(3);
      expect(proposal.passed).to.equal(true);
      expect(proposal.passedAt).to.be.greaterThan(0);

      // Verify helper functions
      expect(await governanceController.hasProposalPassed(0)).to.equal(true);
      expect(await governanceController.getProposalVotes(0)).to.equal(3);
    });

    it("Should handle proposals with insufficient votes", async function () {
      await governanceController.connect(investor).createProposal(
        "Increase ICBTC reserve ratio to 50% for better stability"
      );

      // Only 2 votes (need 3 for automatic execution)
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);

      // Verify proposal is not passed yet
      const proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.passed).to.equal(false);
      expect(proposal.passedAt).to.equal(0);

      // Verify helper functions
      expect(await governanceController.hasProposalPassed(0)).to.equal(false);
      expect(await governanceController.getProposalVotes(0)).to.equal(2);

      // Check active proposals
      const activeProposals = await governanceController.getActiveProposals();
      expect(activeProposals.length).to.equal(1);
      expect(activeProposals[0]).to.equal(0);

      const passedProposals = await governanceController.getPassedProposals();
      expect(passedProposals.length).to.equal(0);
    });
  });

  describe("3. Admin Minting Flow: Direct KYC and IC Minting", function () {
    beforeEach(async function () {
      // Admin directly grants KYC to user1 (new correct flow)
      await icController.connect(admin).grantKyc(user1.address);
    });

    it("Should mint backed IC tokens with correct reserve calculation", async function () {
      // Example: User pays $100 off-chain, Admin mints 100 IC tokens
      const icAmount = ethers.parseEther("100"); // 100 IC tokens
      const usdValue = icAmount; // 1 IC = $1 USD initially

      // Expected reserve amounts (40% BTC, 60% Gold)
      const icbtcUsdValue = (usdValue * 4000n) / 10000n; // $40 worth
      const icautUsdValue = (usdValue * 6000n) / 10000n; // $60 worth
      
      // Calculate token amounts based on prices (matching ICController logic)
      // BTC at $60,000: $40 / $60,000 = ~0.000667 ICBTC
      // Gold at $2,000: $60 / $2,000 = 0.03 ICAUT
      // Note: Oracle prices are 8 decimals, so we need to multiply by 1e10 to convert to 18 decimals
      const expectedIcbtcAmount = (icbtcUsdValue * BigInt(1e18)) / (BTC_PRICE * BigInt(1e10));
      const expectedIcautAmount = (icautUsdValue * BigInt(1e18)) / (GOLD_PRICE * BigInt(1e10));

      await expect(icController.connect(admin).mintBackedIc(user1.address, icAmount))
        .to.emit(icController, "IcMinted")
        .withArgs(user1.address, icAmount, expectedIcbtcAmount, expectedIcautAmount);

      // Check IC tokens were minted to user
      expect(await ic.balanceOf(user1.address)).to.equal(icAmount);

      // Check reserves were updated
      const reserveInfo = await icController.getReserveInfo();
      expect(reserveInfo.icbtcReserves).to.equal(expectedIcbtcAmount);
      expect(reserveInfo.icautReserves).to.equal(expectedIcautAmount);
      expect(reserveInfo.totalMinted).to.equal(icAmount);
    });

    it("Should handle pre-minted reserves correctly", async function () {
      // Get initial balance (from setup pre-minting)
      const initialIcbtcBalance = await icbtc.balanceOf(await icController.getAddress());
      const initialIcautBalance = await icaut.balanceOf(await icController.getAddress());
      
      // Pre-mint some additional reserves
      const preMintIcbtc = ethers.parseEther("1"); // 1 ICBTC
      const preMintIcaut = ethers.parseEther("50"); // 50 ICAUT

      await expect(icController.connect(admin).preMintReserves(preMintIcbtc, preMintIcaut))
        .to.emit(icController, "ReserveTokensMinted")
        .withArgs(preMintIcbtc, preMintIcaut, admin.address);

      // Check contract now holds the additional tokens (on top of setup reserves)
      expect(await icbtc.balanceOf(await icController.getAddress())).to.equal(initialIcbtcBalance + preMintIcbtc);
      expect(await icaut.balanceOf(await icController.getAddress())).to.equal(initialIcautBalance + preMintIcaut);
    });

    it("Should reject minting to non-KYC addresses", async function () {
      const icAmount = ethers.parseEther("1000");

      await expect(icController.connect(admin).mintBackedIc(user2.address, icAmount))
        .to.be.revertedWith("ICController: Recipient not KYC approved");
    });

    it("Should calculate IC value based on reserves", async function () {
      const icAmount = ethers.parseEther("100"); // 100 IC tokens
      
      // Mint some IC tokens
      await icController.connect(admin).mintBackedIc(user1.address, icAmount);

      // Check current IC value (should be close to $1 initially)
      const icValue = await icController.getCurrentIcValue();
      expect(icValue).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.01")); // Within $0.01

      // Check total reserve value
      const totalReserveValue = await icController.getTotalReserveValue();
      expect(totalReserveValue).to.be.greaterThan(0);

      // The reserve value should approximately equal the IC amount minted
      const difference = totalReserveValue > icAmount ? 
        totalReserveValue - icAmount : icAmount - totalReserveValue;
      expect(difference).to.be.lessThan(ethers.parseEther("1")); // Less than 1 token difference
    });
  });

  describe("4. Staking Process: User Staking IC and Withdrawing with Rewards", function () {
    beforeEach(async function () {
      // Setup user1 with KYC and IC tokens (admin directly grants KYC)
      await icController.connect(admin).grantKyc(user1.address);
      
      // Grant KYC to VaultAndYield contract so it can receive IC tokens
      await icController.connect(admin).grantKyc(await vaultAndYield.getAddress());

      // Mint IC tokens to user1
      const icAmount = ethers.parseEther("1000"); // 1000 IC tokens
      await icController.connect(admin).mintBackedIc(user1.address, icAmount);
    });

    it("Should stake IC tokens for 30 days with 7% APY", async function () {
      const stakeAmount = ethers.parseEther("100"); // Reduced from 1000 to 100
      const duration = 30 * 24 * 60 * 60; // 30 days in seconds

      // Approve vault to spend IC tokens
      await ic.connect(user1).approve(await vaultAndYield.getAddress(), stakeAmount);

      // Stake tokens
      await expect(vaultAndYield.connect(user1).stake(stakeAmount, duration))
        .to.emit(vaultAndYield, "Staked")
        .withArgs(user1.address, 0, stakeAmount, duration, 700); // 7% APY = 700 basis points

      // Check stake info
      const stakeInfo = await vaultAndYield.getStakeInfo(user1.address, 0);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.duration).to.equal(duration);
      expect(stakeInfo.apy).to.equal(700);
      expect(stakeInfo.withdrawn).to.be.false;
      expect(stakeInfo.matured).to.be.false;

      // Check TVL
      expect(await vaultAndYield.getTotalValueLocked()).to.equal(stakeAmount);
    });

    it("Should withdraw stake with correct rewards after maturity", async function () {
      const stakeAmount = ethers.parseEther("100"); // Reduced from 1000 to 100
      const duration = 30 * 24 * 60 * 60; // 30 days
      const apy = 700; // 7% APY in basis points

      // Calculate expected rewards
      const expectedRewards = (stakeAmount * BigInt(apy) * BigInt(duration)) / 
                             (BigInt(365 * 24 * 60 * 60) * 10000n);

      // Approve and stake
      await ic.connect(user1).approve(await vaultAndYield.getAddress(), stakeAmount);
      await vaultAndYield.connect(user1).stake(stakeAmount, duration);

      // Fast forward time to after maturity
      await time.increase(duration + 1);

      // Mint additional IC tokens to vault for rewards (in production, this would be from a reward pool)
      const totalWithdrawal = stakeAmount + expectedRewards;
      
      // Grant MINTER_ROLE to deployer temporarily for this test
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
      await ic.grantRole(MINTER_ROLE, deployer.address);
      await ic.connect(deployer).mint(await vaultAndYield.getAddress(), expectedRewards);

      // Withdraw stake
      await expect(vaultAndYield.connect(user1).withdraw(0))
        .to.emit(vaultAndYield, "Withdrawn")
        .withArgs(user1.address, 0, stakeAmount, expectedRewards, totalWithdrawal);

      // Check stake is marked as withdrawn
      const stakeInfo = await vaultAndYield.getStakeInfo(user1.address, 0);
      expect(stakeInfo.withdrawn).to.be.true;

      // Check user received tokens back (original 1000 - 100 staked + rewards)
      const userBalance = await ic.balanceOf(user1.address);
      expect(userBalance).to.be.greaterThan(ethers.parseEther("900")); // Should be around 900 + rewards
    });

    it("Should reject early withdrawal", async function () {
      const stakeAmount = ethers.parseEther("100"); // Reduced from 1000 to 100
      const duration = 30 * 24 * 60 * 60; // 30 days

      await ic.connect(user1).approve(await vaultAndYield.getAddress(), stakeAmount);
      await vaultAndYield.connect(user1).stake(stakeAmount, duration);

      // Try to withdraw before maturity
      await expect(vaultAndYield.connect(user1).withdraw(0))
        .to.be.revertedWith("VaultAndYield: Stake not yet matured");
    });

    it("Should support multiple staking durations with different APYs", async function () {
      const stakeAmount = ethers.parseEther("100"); // Reduced from 1000 to 100
      
      // Test all supported durations
      const durations = [
        { duration: 30 * 24 * 60 * 60, apy: 700 },   // 30 days, 7%
        { duration: 90 * 24 * 60 * 60, apy: 900 },   // 90 days, 9%
        { duration: 180 * 24 * 60 * 60, apy: 1200 }, // 180 days, 12%
        { duration: 365 * 24 * 60 * 60, apy: 1500 }, // 365 days, 15%
        { duration: 730 * 24 * 60 * 60, apy: 1800 }  // 730 days, 18%
      ];

      for (let i = 0; i < durations.length; i++) {
        await ic.connect(user1).approve(await vaultAndYield.getAddress(), stakeAmount);
        await expect(vaultAndYield.connect(user1).stake(stakeAmount, durations[i].duration))
          .to.emit(vaultAndYield, "Staked")
          .withArgs(user1.address, i, stakeAmount, durations[i].duration, durations[i].apy);
      }

      expect(await vaultAndYield.getUserStakeCount(user1.address)).to.equal(5);
    });
  });

  describe("5. IC Burning and Reserve Redemption", function () {
    beforeEach(async function () {
      // Setup user1 with KYC and IC tokens (admin directly grants KYC)
      await icController.connect(admin).grantKyc(user1.address);

      // Mint IC tokens to user1
      const icAmount = ethers.parseEther("1000"); // 1000 IC tokens
      await icController.connect(admin).mintBackedIc(user1.address, icAmount);
    });

    it("Should burn IC tokens and return proportional reserves", async function () {
      const burnAmount = ethers.parseEther("1000");
      const userInitialBalance = await ic.balanceOf(user1.address);

      // Get initial reserve info
      const initialReserves = await icController.getReserveInfo();

      // Calculate expected returns
      const expectedIcbtcReturn = (initialReserves.icbtcReserves * burnAmount) / initialReserves.totalMinted;
      const expectedIcautReturn = (initialReserves.icautReserves * burnAmount) / initialReserves.totalMinted;

      // Burn IC tokens (admin calls burnIc on behalf of user)
      await expect(icController.connect(admin).burnIc(user1.address, burnAmount))
        .to.emit(icController, "IcBurned")
        .withArgs(user1.address, burnAmount, expectedIcbtcReturn, expectedIcautReturn);

      // Check IC balance decreased
      expect(await ic.balanceOf(user1.address)).to.equal(userInitialBalance - burnAmount);

      // Check reserves were updated
      const finalReserves = await icController.getReserveInfo();
      expect(finalReserves.totalMinted).to.equal(initialReserves.totalMinted - burnAmount);
      expect(finalReserves.icbtcReserves).to.equal(initialReserves.icbtcReserves - expectedIcbtcReturn);
      expect(finalReserves.icautReserves).to.equal(initialReserves.icautReserves - expectedIcautReturn);
    });
  });

  describe("6. KYC Enforcement", function () {
    beforeEach(async function () {
      // Grant KYC to user1 only (admin directly grants KYC)
      await icController.connect(admin).grantKyc(user1.address);

      // Mint IC tokens to user1
      const icAmount = ethers.parseEther("1000");
      await icController.connect(admin).mintBackedIc(user1.address, icAmount);
    });

    it("Should prevent transfers to non-KYC addresses", async function () {
      const transferAmount = ethers.parseEther("100");

      await expect(ic.connect(user1).transfer(user2.address, transferAmount))
        .to.be.revertedWith("IC: Recipient not KYC approved");
    });

    it("Should allow transfers between KYC-approved addresses", async function () {
      // Grant KYC to user2 (admin directly grants KYC)
      await icController.connect(admin).grantKyc(user2.address);

      const transferAmount = ethers.parseEther("100");
      
      await expect(ic.connect(user1).transfer(user2.address, transferAmount))
        .to.not.be.reverted;

      expect(await ic.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });

  describe("7. Error Cases and Edge Conditions", function () {
    it("Should reject invalid staking durations", async function () {
      await expect(vaultAndYield.connect(user1).stake(ethers.parseEther("1000"), 15 * 24 * 60 * 60))
        .to.be.revertedWith("VaultAndYield: Unsupported staking duration");
    });

    it("Should reject proposals from non-actors", async function () {
      await expect(governanceController.connect(user1).createProposal("Invalid proposal from non-actor"))
        .to.be.revertedWith("GovernanceController: Only actors can create proposals");
    });

    it("Should reject voting without ICGOVT tokens", async function () {
      // Create a proposal first
      await governanceController.connect(investor).createProposal("Test proposal for token requirement");

      // Try to vote without ICGOVT tokens (user1 has none and is not an actor)
      await expect(governanceController.connect(user1).vote(0, true))
        .to.be.revertedWith("GovernanceController: Only actors can vote");
    });
  });

  describe("8. Enhanced Governance Tests", function () {
    it("Should test multiple proposals and tracking", async function () {
      // Create multiple proposals
      await governanceController.connect(investor).createProposal(
        "Proposal 1: Adjust ICBTC ratio to 45%"
      );
      await governanceController.connect(advisor).createProposal(
        "Proposal 2: Increase staking rewards"
      );
      await governanceController.connect(team).createProposal(
        "Proposal 3: Emergency pause mechanism"
      );

      // Check total proposals
      expect(await governanceController.getProposalCount()).to.equal(3);

      // All should be active initially
      let activeProposals = await governanceController.getActiveProposals();
      expect(activeProposals.length).to.equal(3);

      // Pass first proposal
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, true);

      // Check proposal states
      activeProposals = await governanceController.getActiveProposals();
      const passedProposals = await governanceController.getPassedProposals();
      
      expect(activeProposals.length).to.equal(2); // Proposals 1 and 2
      expect(passedProposals.length).to.equal(1);  // Proposal 0
      expect(passedProposals[0]).to.equal(0);

      // Vote on second proposal (only 2 votes)
      await governanceController.connect(advisor).vote(1, true);
      await governanceController.connect(custodian).vote(1, true);

      // Second proposal should still be active
      expect(await governanceController.hasProposalPassed(1)).to.equal(false);
      expect(await governanceController.getProposalVotes(1)).to.equal(2);
    });

    it("Should prevent double voting", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for double voting prevention"
      );

      // First vote should succeed
      await governanceController.connect(investor).vote(0, true);

      // Second vote from same actor should fail
      await expect(governanceController.connect(investor).vote(0, true))
        .to.be.revertedWith("GovernanceController: Actor has already voted");
    });

    it("Should prevent voting on passed proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for post-pass voting prevention"
      );

      // Pass the proposal
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, true);

      // Verify it's passed
      expect(await governanceController.hasProposalPassed(0)).to.equal(true);

      // Try to vote again should fail
      await expect(governanceController.connect(custodian).vote(0, true))
        .to.be.revertedWith("GovernanceController: Proposal already passed");
    });

    it("Should require ICGOVT tokens for proposal creation", async function () {
      // Transfer all ICGOVT tokens away from investor
      const balance = await icgovt.balanceOf(investor.address);
      await icgovt.connect(investor).transfer(advisor.address, balance);

      // Should fail to create proposal without tokens
      await expect(governanceController.connect(investor).createProposal(
        "Proposal without tokens"
      ))
        .to.be.revertedWith("GovernanceController: Must hold ICGOVT tokens to create proposals");

      // Restore tokens for other tests
      await icgovt.connect(advisor).transfer(investor.address, balance);
    });

    it("Should test various proposal categories", async function () {
      // Test different types of proposals (all off-chain)
      const proposals = [
        "Reserve Management: Adjust ICBTC ratio from 40% to 45%",
        "IC Operations: Increase maximum minting limit to $50M",
        "Emergency Actions: Implement circuit breaker for high volatility",
        "System Updates: Upgrade oracle to Chainlink feeds",
        "Fee Structure: Reduce staking withdrawal fees by 0.1%"
      ];

      // Create all proposals
      for (let i = 0; i < proposals.length; i++) {
        await expect(governanceController.connect(investor).createProposal(proposals[i]))
          .to.emit(governanceController, "ProposalCreated")
          .withArgs(i, investor.address, proposals[i]);
      }

      // Verify all are active
      const activeProposals = await governanceController.getActiveProposals();
      expect(activeProposals.length).to.equal(5);

      // Pass some proposals
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, true); // Auto-pass

      await governanceController.connect(investor).vote(2, true);
      await governanceController.connect(advisor).vote(2, true);
      await governanceController.connect(custodian).vote(2, true); // Auto-pass

      // Check final state
      const finalActive = await governanceController.getActiveProposals();
      const finalPassed = await governanceController.getPassedProposals();
      
      expect(finalActive.length).to.equal(3); // 1, 3, 4
      expect(finalPassed.length).to.equal(2);  // 0, 2
    });
  });

  describe("9. Voting Timeline Tests", function () {
    it("Should create proposals with voting deadlines", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal with timeline"
      );

      const proposal = await governanceController.getProposal(0);
      expect(proposal.votingDeadline).to.be.greaterThan(proposal.createdAt);
      
      // Default voting period is 7 days
      const expectedDeadline = proposal.createdAt + BigInt(7 * 24 * 60 * 60);
      expect(proposal.votingDeadline).to.equal(expectedDeadline);
    });

    it("Should prevent voting after deadline", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for deadline check"
      );

      // Fast forward past the deadline
      await time.increase(8 * 24 * 60 * 60); // 8 days

      // Voting should be rejected
      await expect(governanceController.connect(advisor).vote(0, true))
        .to.be.revertedWith("GovernanceController: Voting period has ended");
    });

    it("Should allow expiring proposals after deadline", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for expiration"
      );

      // Vote once (not enough to pass)
      await governanceController.connect(investor).vote(0, true);

      // Fast forward past deadline
      await time.increase(8 * 24 * 60 * 60);

      // Should be able to expire the proposal
      await expect(governanceController.expireProposal(0))
        .to.emit(governanceController, "ProposalExpired")
        .withArgs(0, 1);

      const proposal = await governanceController.getProposal(0);
      expect(proposal.expired).to.equal(true);
    });

    it("Should track voting time correctly", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for time tracking"
      );

      // Check voting is active
      expect(await governanceController.isVotingActive(0)).to.equal(true);

      // Check remaining time (should be close to 7 days)
      const remainingTime = await governanceController.getRemainingVotingTime(0);
      expect(remainingTime).to.be.greaterThan(BigInt(Math.floor(6.9 * 24 * 60 * 60)));

      // Fast forward halfway
      await time.increase(Math.floor(3.5 * 24 * 60 * 60));
      
      const halfwayTime = await governanceController.getRemainingVotingTime(0);
      expect(halfwayTime).to.be.lessThan(remainingTime);
      expect(halfwayTime).to.be.greaterThan(BigInt(3 * 24 * 60 * 60));

      // Fast forward past deadline
      await time.increase(4 * 24 * 60 * 60);
      
      expect(await governanceController.isVotingActive(0)).to.equal(false);
      expect(await governanceController.getRemainingVotingTime(0)).to.equal(0);
    });

    it("Should update voting period correctly", async function () {
      const newPeriod = 3 * 24 * 60 * 60; // 3 days

      await expect(governanceController.connect(investor).updateVotingPeriod(newPeriod))
        .to.emit(governanceController, "VotingPeriodUpdated")
        .withArgs(7 * 24 * 60 * 60, newPeriod, investor.address);

      expect(await governanceController.votingPeriod()).to.equal(newPeriod);

      // New proposals should use the updated period
      await governanceController.connect(advisor).createProposal(
        "Proposal with updated period"
      );

      const proposal = await governanceController.getProposal(0);
      const expectedDeadline = proposal.createdAt + BigInt(newPeriod);
      expect(proposal.votingDeadline).to.equal(expectedDeadline);
    });

    it("Should handle expired proposals in getActiveProposals", async function () {
      // Create multiple proposals
      await governanceController.connect(investor).createProposal("Proposal 1");
      await governanceController.connect(advisor).createProposal("Proposal 2");
      await governanceController.connect(team).createProposal("Proposal 3");

      // All should be active initially
      let activeProposals = await governanceController.getActiveProposals();
      expect(activeProposals.length).to.equal(3);

      // Pass one proposal
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, true);

      // Fast forward to expire remaining proposals
      await time.increase(8 * 24 * 60 * 60);

      // Only passed proposals should remain, expired should be filtered out
      activeProposals = await governanceController.getActiveProposals();
      expect(activeProposals.length).to.equal(0);

      // Check expired proposals
      const expiredProposals = await governanceController.getExpiredProposals();
      expect(expiredProposals.length).to.equal(2); // Proposals 1 and 2 expired
    });

    it("Should reject invalid voting period updates", async function () {
      // Too short
      await expect(governanceController.connect(investor).updateVotingPeriod(12 * 60 * 60)) // 12 hours
        .to.be.revertedWith("GovernanceController: Voting period too short");

      // Too long  
      await expect(governanceController.connect(investor).updateVotingPeriod(31 * 24 * 60 * 60)) // 31 days
        .to.be.revertedWith("GovernanceController: Voting period too long");

      // Non-actor
      await expect(governanceController.connect(user1).updateVotingPeriod(5 * 24 * 60 * 60))
        .to.be.revertedWith("GovernanceController: Only actors can update voting period");
    });
  });

  describe("10. For/Against Voting and Tie Handling Tests", function () {
    it("Should support voting against proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for against voting"
      );

      // Vote against the proposal
      await expect(governanceController.connect(advisor).vote(0, false))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, advisor.address, false);

      // Check vote counts
      const proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(1);
      expect(proposal.passed).to.equal(false);
      expect(proposal.failed).to.equal(false);

      // Test new getter functions
      expect(await governanceController.getProposalVotes(0)).to.equal(0);
      expect(await governanceController.getProposalAgainstVotes(0)).to.equal(1);
      
      const voteCounts = await governanceController.getProposalVoteCounts(0);
      expect(voteCounts.forVotes).to.equal(0);
      expect(voteCounts.againstVotes).to.equal(1);
    });

    it("Should automatically fail proposal with 3 against votes", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for automatic failure"
      );

      // First against vote
      await governanceController.connect(investor).vote(0, false);
      
      // Second against vote
      await governanceController.connect(advisor).vote(0, false);
      
      // Third against vote should trigger automatic failure
      await expect(governanceController.connect(team).vote(0, false))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, team.address, false)
        .and.to.emit(governanceController, "ProposalFailed")
        .withArgs(0, 3);

      // Verify proposal failed
      const proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(3);
      expect(proposal.passed).to.equal(false);
      expect(proposal.failed).to.equal(true);
      expect(proposal.tied).to.equal(false);

      // Test helper functions
      expect(await governanceController.hasProposalFailed(0)).to.equal(true);
      expect(await governanceController.hasProposalPassed(0)).to.equal(false);
      expect(await governanceController.hasProposalTied(0)).to.equal(false);
    });

    it("Should handle 2-2 tie votes with immediate resolution", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for tie scenario"
      );

      // Two for votes
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      
      // Two against votes - the last vote should trigger tie
      await governanceController.connect(team).vote(0, false);
      
      await expect(governanceController.connect(custodian).vote(0, false))
        .to.emit(governanceController, "VoteCast")
        .withArgs(0, custodian.address, false)
        .and.to.emit(governanceController, "ProposalTied")
        .withArgs(0, 2, 2);

      // Verify proposal is tied
      const proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.againstVotes).to.equal(2);
      expect(proposal.passed).to.equal(false);
      expect(proposal.failed).to.equal(false);
      expect(proposal.tied).to.equal(true);
      expect(proposal.expired).to.equal(false);

      // Test helper functions
      expect(await governanceController.hasProposalTied(0)).to.equal(true);
      expect(await governanceController.hasProposalPassed(0)).to.equal(false);
      expect(await governanceController.hasProposalFailed(0)).to.equal(false);
    });

    it("Should prevent voting on tied proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for tie prevention"
      );

      // Create a 2-2 tie
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, false);
      await governanceController.connect(custodian).vote(0, false);

      // Verify it's tied
      expect(await governanceController.hasProposalTied(0)).to.equal(true);

      // Try to vote again should fail (though all actors already voted)
      // This tests the require statement for tied proposals
      await expect(governanceController.connect(investor).vote(0, true))
        .to.be.revertedWith("GovernanceController: Actor has already voted");
    });

    it("Should track individual actor votes correctly", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for vote tracking"
      );

      // Mix of for and against votes
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, false);
      await governanceController.connect(team).vote(0, true);

      // Check individual votes using getActorVote
      let actorVote = await governanceController.getActorVote(0, investor.address);
      expect(actorVote.actorHasVoted).to.equal(true);
      expect(actorVote.support).to.equal(true);

      actorVote = await governanceController.getActorVote(0, advisor.address);
      expect(actorVote.actorHasVoted).to.equal(true);
      expect(actorVote.support).to.equal(false);

      actorVote = await governanceController.getActorVote(0, team.address);
      expect(actorVote.actorHasVoted).to.equal(true);
      expect(actorVote.support).to.equal(true);

      actorVote = await governanceController.getActorVote(0, custodian.address);
      expect(actorVote.actorHasVoted).to.equal(false);
      expect(actorVote.support).to.equal(false); // Default value, not meaningful since hasn't voted
    });

    it("Should get failed proposals correctly", async function () {
      // Create multiple proposals
      await governanceController.connect(investor).createProposal("Proposal 1");
      await governanceController.connect(advisor).createProposal("Proposal 2");
      await governanceController.connect(team).createProposal("Proposal 3");

      // Pass proposal 0
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, true);

      // Fail proposal 1
      await governanceController.connect(investor).vote(1, false);
      await governanceController.connect(advisor).vote(1, false);
      await governanceController.connect(team).vote(1, false);

      // Tie proposal 2
      await governanceController.connect(investor).vote(2, true);
      await governanceController.connect(advisor).vote(2, true);
      await governanceController.connect(team).vote(2, false);
      await governanceController.connect(custodian).vote(2, false);

      // Check proposal lists
      const passedProposals = await governanceController.getPassedProposals();
      const failedProposals = await governanceController.getFailedProposals();
      const tiedProposals = await governanceController.getTiedProposals();
      const activeProposals = await governanceController.getActiveProposals();

      expect(passedProposals.length).to.equal(1);
      expect(passedProposals[0]).to.equal(0);

      expect(failedProposals.length).to.equal(1);
      expect(failedProposals[0]).to.equal(1);

      expect(tiedProposals.length).to.equal(1);
      expect(tiedProposals[0]).to.equal(2);

      expect(activeProposals.length).to.equal(0); // All resolved
    });

    it("Should prevent voting on failed proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test proposal for failure prevention"
      );

      // Fail the proposal
      await governanceController.connect(investor).vote(0, false);
      await governanceController.connect(advisor).vote(0, false);
      await governanceController.connect(team).vote(0, false);

      // Verify it's failed
      expect(await governanceController.hasProposalFailed(0)).to.equal(true);

      // Try to vote again should fail
      await expect(governanceController.connect(custodian).vote(0, false))
        .to.be.revertedWith("GovernanceController: Proposal already failed");
    });

    it("Should handle mixed voting scenarios correctly", async function () {
      await governanceController.connect(investor).createProposal(
        "Mixed voting scenario"
      );

      // 2 for, 1 against - should remain active
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, false);

      let proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.againstVotes).to.equal(1);
      expect(proposal.passed).to.equal(false);
      expect(proposal.failed).to.equal(false);
      expect(proposal.tied).to.equal(false);

      // Fourth vote for should pass it
      await expect(governanceController.connect(custodian).vote(0, true))
        .to.emit(governanceController, "ProposalPassed")
        .withArgs(0, custodian.address, 3);

      proposal = await governanceController.getProposal(0);
      expect(proposal.forVotes).to.equal(3);
      expect(proposal.againstVotes).to.equal(1);
      expect(proposal.passed).to.equal(true);
    });

    it("Should update voting activity checks for tied proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test voting activity with ties"
      );

      // Initially active
      expect(await governanceController.isVotingActive(0)).to.equal(true);
      expect(await governanceController.getRemainingVotingTime(0)).to.be.greaterThan(0);

      // Create a tie
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, false);
      await governanceController.connect(custodian).vote(0, false);

      // Should no longer be active due to tie
      expect(await governanceController.isVotingActive(0)).to.equal(false);
      expect(await governanceController.getRemainingVotingTime(0)).to.equal(0);
    });

    it("Should prevent expiring tied proposals", async function () {
      await governanceController.connect(investor).createProposal(
        "Test expiration prevention for ties"
      );

      // Create a tie
      await governanceController.connect(investor).vote(0, true);
      await governanceController.connect(advisor).vote(0, true);
      await governanceController.connect(team).vote(0, false);
      await governanceController.connect(custodian).vote(0, false);

      // Fast forward past deadline
      await time.increase(8 * 24 * 60 * 60);

      // Should not be able to expire a tied proposal
      await expect(governanceController.expireProposal(0))
        .to.be.revertedWith("GovernanceController: Proposal already tied");
    });
  });

  describe("11. Emergency Features Tests", function () {
    beforeEach(async function () {
      // Grant emergency role to admin and investor for testing
      await ic.grantRole(await ic.EMERGENCY_ROLE(), admin.address);
      await ic.grantRole(await ic.EMERGENCY_ROLE(), investor.address);
    });

    it("Should require 2 signatures for emergency pause", async function () {
      const nonce = 1;

      // First signature - should not pause yet
      await expect(ic.connect(admin).emergencyPause(nonce))
        .to.emit(ic, "EmergencyOperationSigned");

      // Contract should still be unpaused
      expect(await ic.paused()).to.equal(false);

      // Second signature - should execute pause
      await expect(ic.connect(investor).emergencyPause(nonce))
        .to.emit(ic, "EmergencyOperationSigned")
        .and.to.emit(ic, "EmergencyOperationExecuted")
        .and.to.emit(ic, "EmergencyPaused");

      // Contract should now be paused
      expect(await ic.paused()).to.equal(true);

      // Test that transfers are blocked when paused (we need to unpause first to mint, then pause again)
      const unpauseNonce = 100;
      await ic.connect(admin).emergencyUnpause(unpauseNonce);
      await ic.connect(investor).emergencyUnpause(unpauseNonce);
      
      // Now mint tokens while unpaused
      await icController.connect(admin).grantKyc(user1.address);
      await icController.connect(admin).grantKyc(user2.address);
      await icController.connect(admin).mintBackedIc(user1.address, ethers.parseEther("100"));
      
      // Pause again
      const pauseNonce2 = 101;
      await ic.connect(admin).emergencyPause(pauseNonce2);
      await ic.connect(investor).emergencyPause(pauseNonce2);
      
      // Now transfers should be blocked
      await expect(ic.connect(user1).transfer(user2.address, ethers.parseEther("1")))
        .to.be.revertedWithCustomError(ic, "EnforcedPause");
    });

    it("Should require 2 signatures for minting freeze", async function () {
      const nonce = 2;

      // First signature
      await ic.connect(admin).freezeMinting(nonce);
      expect(await ic.mintingFrozen()).to.equal(false);

      // Second signature - should execute freeze
      await expect(ic.connect(investor).freezeMinting(nonce))
        .to.emit(ic, "MintingFrozen");

      expect(await ic.mintingFrozen()).to.equal(true);

      // Setup KYC for user1 first
      await icController.connect(admin).grantKyc(user1.address);
      
      // Minting should be blocked
      await expect(icController.connect(admin).mintBackedIc(user1.address, ethers.parseEther("100")))
        .to.be.revertedWith("IC: Minting is frozen");
    });

    it("Should require 2 signatures for emergency burn", async function () {
      // First ensure user1 has KYC and tokens
      await icController.connect(admin).grantKyc(user1.address);
      await icController.connect(admin).mintBackedIc(user1.address, ethers.parseEther("1000"));
      const initialBalance = await ic.balanceOf(user1.address);
      
      const nonce = 3;
      const burnAmount = ethers.parseEther("500");

      // First signature
      await ic.connect(admin).emergencyBurn(user1.address, burnAmount, nonce);
      expect(await ic.balanceOf(user1.address)).to.equal(initialBalance);

      // Second signature - should execute burn
      await expect(ic.connect(investor).emergencyBurn(user1.address, burnAmount, nonce))
        .to.emit(ic, "EmergencyOperationExecuted");

      expect(await ic.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should prevent double signing same operation", async function () {
      const nonce = 4;

      // First signature
      await ic.connect(admin).emergencyPause(nonce);

      // Same signer tries to sign again
      await expect(ic.connect(admin).emergencyPause(nonce))
        .to.be.revertedWith("IC: Already signed this operation");
    });

    it("Should track emergency signatures correctly", async function () {
      const nonce = 5;
      
      // Check initial state
      const operationHash = ethers.keccak256(
        ethers.solidityPacked(["string", "uint256", "uint256"], ["PAUSE", nonce, (await ethers.provider.getNetwork()).chainId])
      );
      
      expect(await ic.getEmergencySignatures(operationHash)).to.equal(0);

      // First signature
      await ic.connect(admin).emergencyPause(nonce);
      expect(await ic.getEmergencySignatures(operationHash)).to.equal(1);
      expect(await ic.hasSignedEmergencyOperation(operationHash, admin.address)).to.equal(true);

      // Second signature
      await ic.connect(investor).emergencyPause(nonce);
      expect(await ic.getEmergencySignatures(operationHash)).to.equal(2);
      expect(await ic.hasSignedEmergencyOperation(operationHash, investor.address)).to.equal(true);
    });

    it("Should handle zero oracle prices gracefully", async function () {
      // Deploy a fresh oracle for this test to avoid ownership issues
      const MockOracleFactory = await ethers.getContractFactory("MockOracle");
      const testOracle = await MockOracleFactory.deploy(deployer.address);
      
      // Deploy a fresh ICController with the test oracle
      const ICControllerFactory = await ethers.getContractFactory("ICController");
      const testController = await ICControllerFactory.deploy(
        await ic.getAddress(),
        await icbtc.getAddress(),
        await icaut.getAddress(),
        await testOracle.getAddress()
      );

      // Grant necessary roles (admin manages KYC directly now)
      const RESERVE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESERVE_MANAGER_ROLE"));
      await testController.grantRole(RESERVE_MANAGER_ROLE, admin.address);
      await testController.connect(admin).grantKyc(user1.address);

      // Set oracle prices to zero
      await testOracle.setBtcPrice(0);
      await testOracle.setGoldPrice(0);

      await expect(testController.connect(admin).mintBackedIc(user1.address, ethers.parseEther("1000")))
        .to.be.revertedWith("ICController: Invalid oracle prices");
    });
  });
});
