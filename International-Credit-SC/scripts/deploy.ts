import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeployedContracts {
  MockOracle: string;
  ICBTC: string;
  ICAUT: string;
  IC: string;
  ICGOVT: string;
  ICController: string;
  GovernanceController: string;
  VaultAndYield: string;
  deploymentBlock: number;
  timestamp: number;
  network: string;
}

async function main() {
  console.log("🚀 Starting IC System deployment on Hedera testnet...\n");

  // Get deployment parameters from environment
  const {
    ADMIN_ADDRESS,
    INVESTOR_ADDRESS,
    ADVISOR_ADDRESS,
    TEAM_ADDRESS,
    CUSTODIAN_ADDRESS,
    SIGNER1_ADDRESS,
    SIGNER2_ADDRESS
  } = process.env;

  // Validate required environment variables
  if (!ADMIN_ADDRESS || !INVESTOR_ADDRESS || !ADVISOR_ADDRESS || !TEAM_ADDRESS || !CUSTODIAN_ADDRESS) {
    throw new Error("Missing required environment variables. Please check your .env file.");
  }

  // Use admin as default signer1 if not specified
  const EMERGENCY_SIGNER1 = SIGNER1_ADDRESS || ADMIN_ADDRESS;
  const EMERGENCY_SIGNER2 = SIGNER2_ADDRESS || INVESTOR_ADDRESS;

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const deployedContracts: DeployedContracts = {
    MockOracle: "",
    ICBTC: "",
    ICAUT: "",
    IC: "",
    ICGOVT: "",
    ICController: "",
    GovernanceController: "",
    VaultAndYield: "",
    deploymentBlock: 0,
    timestamp: Date.now(),
    network: "hedera"
  };

  try {
    // 1. Deploy MockOracle
    console.log("1️⃣ Deploying MockOracle...");
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const mockOracle = await MockOracle.deploy(deployer.address);
    await mockOracle.waitForDeployment();
    deployedContracts.MockOracle = await mockOracle.getAddress();
    console.log(`   ✅ MockOracle deployed at: ${deployedContracts.MockOracle}\n`);

    // 2. Deploy ICBTC
    console.log("2️⃣ Deploying ICBTC...");
    const ICBTC = await ethers.getContractFactory("ICBTC");
    const icbtc = await ICBTC.deploy(
      ethers.parseEther("1000000"), // 1M initial supply
      "International Credit Bitcoin Backed Token",
      "ICBTC"
    );
    await icbtc.waitForDeployment();
    deployedContracts.ICBTC = await icbtc.getAddress();
    console.log(`   ✅ ICBTC deployed at: ${deployedContracts.ICBTC}\n`);

    // 3. Deploy ICAUT
    console.log("3️⃣ Deploying ICAUT...");
    const ICAUT = await ethers.getContractFactory("ICAUT");
    const icaut = await ICAUT.deploy(
      ethers.parseEther("1000000"), // 1M initial supply
      "International Credit Gold Backed Token",
      "ICAUT"
    );
    await icaut.waitForDeployment();
    deployedContracts.ICAUT = await icaut.getAddress();
    console.log(`   ✅ ICAUT deployed at: ${deployedContracts.ICAUT}\n`);

    // 4. Deploy IC (will set ICController later)
    console.log("4️⃣ Deploying IC...");
    const IC = await ethers.getContractFactory("IC");
    const ic = await IC.deploy(
      ethers.ZeroAddress, // ICController address will be set later
      "International Credit",
      "IC"
    );
    await ic.waitForDeployment();
    deployedContracts.IC = await ic.getAddress();
    console.log(`   ✅ IC deployed at: ${deployedContracts.IC}\n`);

    // 5. Deploy ICGOVT
    console.log("5️⃣ Deploying ICGOVT...");
    const ICGOVT = await ethers.getContractFactory("ICGOVT");
    const icgovt = await ICGOVT.deploy(
      "International Credit Governance Token",
      "ICGOVT"
    );
    await icgovt.waitForDeployment();
    deployedContracts.ICGOVT = await icgovt.getAddress();
    console.log(`   ✅ ICGOVT deployed at: ${deployedContracts.ICGOVT}\n`);

    // 6. Deploy ICController
    console.log("6️⃣ Deploying ICController...");
    const ICController = await ethers.getContractFactory("ICController");
    const icController = await ICController.deploy(
      deployedContracts.IC,
      deployedContracts.ICBTC,
      deployedContracts.ICAUT,
      deployedContracts.MockOracle
    );
    await icController.waitForDeployment();
    deployedContracts.ICController = await icController.getAddress();
    console.log(`   ✅ ICController deployed at: ${deployedContracts.ICController}\n`);

    // 7. Deploy GovernanceController
    console.log("7️⃣ Deploying GovernanceController...");
    const GovernanceController = await ethers.getContractFactory("GovernanceController");
    const governanceController = await GovernanceController.deploy(
      INVESTOR_ADDRESS,
      ADVISOR_ADDRESS,
      TEAM_ADDRESS,
      CUSTODIAN_ADDRESS,
      deployedContracts.ICGOVT
    );
    await governanceController.waitForDeployment();
    deployedContracts.GovernanceController = await governanceController.getAddress();
    console.log(`   ✅ GovernanceController deployed at: ${deployedContracts.GovernanceController}\n`);

    // 8. Deploy VaultAndYield
    console.log("8️⃣ Deploying VaultAndYield...");
    const VaultAndYield = await ethers.getContractFactory("VaultAndYield");
    const vaultAndYield = await VaultAndYield.deploy(deployedContracts.IC);
    await vaultAndYield.waitForDeployment();
    deployedContracts.VaultAndYield = await vaultAndYield.getAddress();
    console.log(`   ✅ VaultAndYield deployed at: ${deployedContracts.VaultAndYield}\n`);

    // Get deployment block number
    const deploymentTx = await ethers.provider.getTransaction(await icController.deploymentTransaction()?.hash || "");
    deployedContracts.deploymentBlock = deploymentTx?.blockNumber || 0;

    console.log("🔧 Starting post-deployment setup...\n");

    // Post-Deployment Setup
    console.log("9️⃣ Setting up roles and permissions...");

    // Set ICController address in IC token
    console.log("   📝 Setting ICController in IC token...");
    const icContract = await ethers.getContractAt("IC", deployedContracts.IC);
    await icContract.setICController(deployedContracts.ICController);

    // Set ICController in ICBTC and ICAUT
    console.log("   📝 Setting ICController in ICBTC...");
    const icbtcContract = await ethers.getContractAt("ICBTC", deployedContracts.ICBTC);
    await icbtcContract.setICController(deployedContracts.ICController);

    console.log("   📝 Setting ICController in ICAUT...");
    const icautContract = await ethers.getContractAt("ICAUT", deployedContracts.ICAUT);
    await icautContract.setICController(deployedContracts.ICController);

    // Grant roles - Admin now handles KYC directly
    console.log("   🔑 Granting RESERVE_MANAGER_ROLE to ADMIN_ADDRESS (includes KYC management)...");
    const icControllerContract = await ethers.getContractAt("ICController", deployedContracts.ICController);
    const RESERVE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESERVE_MANAGER_ROLE"));
    await icControllerContract.grantRole(RESERVE_MANAGER_ROLE, ADMIN_ADDRESS);

    // Setup Emergency Multisig Roles for IC Token
    console.log("   🚨 Setting up emergency multisig roles for IC token...");
    const EMERGENCY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EMERGENCY_ROLE"));
    
    console.log(`   🔑 Granting EMERGENCY_ROLE to SIGNER1: ${EMERGENCY_SIGNER1}...`);
    await icContract.grantRole(EMERGENCY_ROLE, EMERGENCY_SIGNER1);
    
    console.log(`   🔑 Granting EMERGENCY_ROLE to SIGNER2: ${EMERGENCY_SIGNER2}...`);
    await icContract.grantRole(EMERGENCY_ROLE, EMERGENCY_SIGNER2);
    
    // Grant KYC to VaultAndYield for staking operations
    console.log("   🔑 Granting KYC to VaultAndYield for token transfers...");
    await icControllerContract.grantKyc(deployedContracts.VaultAndYield);
    
    // Note: COMPLIANCE_ROLE is no longer needed as admin manages KYC directly

    console.log("   🔑 Granting MINTER_ROLE on ICBTC to ICController...");
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await icbtcContract.grantRole(MINTER_ROLE, deployedContracts.ICController);

    console.log("   🔑 Granting MINTER_ROLE on ICAUT to ICController...");
    await icautContract.grantRole(MINTER_ROLE, deployedContracts.ICController);

    // Set initial oracle prices 
    console.log("   📊 Setting initial oracle prices...");
    const mockOracleContract = await ethers.getContractAt("MockOracle", deployedContracts.MockOracle);
    await mockOracleContract.setBtcPrice(ethers.parseUnits("101000", 8));
    console.log("   ✅ Set initial BTC price to $101,000");
    await mockOracleContract.setGoldPrice(ethers.parseUnits("3500", 8));
    console.log("   ✅ Set initial Gold price to $3,500");


    // Mint governance tokens
    console.log("🪙 Minting ICGOVT tokens to governance actors...");
    const icgovtContract = await ethers.getContractAt("ICGOVT", deployedContracts.ICGOVT);
    const governanceAmount = ethers.parseEther("250000"); // 250,000 tokens each

    await icgovtContract.mint(INVESTOR_ADDRESS, governanceAmount);
    console.log(`   ✅ Minted ${ethers.formatEther(governanceAmount)} ICGOVT to Investor`);

    await icgovtContract.mint(ADVISOR_ADDRESS, governanceAmount);
    console.log(`   ✅ Minted ${ethers.formatEther(governanceAmount)} ICGOVT to Advisor`);

    await icgovtContract.mint(TEAM_ADDRESS, governanceAmount);
    console.log(`   ✅ Minted ${ethers.formatEther(governanceAmount)} ICGOVT to Team`);

    await icgovtContract.mint(CUSTODIAN_ADDRESS, governanceAmount);
    console.log(`   ✅ Minted ${ethers.formatEther(governanceAmount)} ICGOVT to Custodian\n`);

    // Pre-mint large amounts of reserves for smooth testing
    console.log("🏦 Pre-minting large reserve amounts for testing...");
    
    // Calculate reserves for $50M worth of IC tokens
    // At $101,000 BTC and $3,500 Gold:
    // Total reserve needed: $50M
    // 40% ICBTC: $20M / $101,000 = ~198.02 ICBTC
    // 60% ICAUT: $30M / $3,500 = ~8,571.43 ICAUT
    
    const reserveValueUsd = ethers.parseEther("50000000"); // $50M worth
    const btcPriceWei = ethers.parseEther("101000"); // $101,000 in 18 decimals
    const goldPriceWei = ethers.parseEther("3500"); // $3,500 in 18 decimals
    
    // Calculate reserve amounts (40% ICBTC, 60% ICAUT)
    const icbtcReserveUsd = (reserveValueUsd * 4000n) / 10000n; // 40%
    const icautReserveUsd = (reserveValueUsd * 6000n) / 10000n; // 60%
    
    // Convert USD amounts to token amounts
    const icbtcAmount = (icbtcReserveUsd * BigInt(1e18)) / btcPriceWei;
    const icautAmount = (icautReserveUsd * BigInt(1e18)) / goldPriceWei;
    
    console.log(`   📊 Calculated reserve requirements for $50M backing:`);
    console.log(`   💰 ICBTC needed: ${ethers.formatEther(icbtcAmount)} (~$${ethers.formatEther(icbtcReserveUsd)})`);
    console.log(`   🥇 ICAUT needed: ${ethers.formatEther(icautAmount)} (~$${ethers.formatEther(icautReserveUsd)})`);
    
    await icControllerContract.preMintReserves(icbtcAmount, icautAmount);
    console.log("   ✅ Successfully pre-minted reserves to ICController");
    
    // Verify reserves were minted
    const availableReserves = await icControllerContract.getAvailableReserves();
    console.log(`   📋 Available ICBTC reserves: ${ethers.formatEther(availableReserves.availableIcbtc)}`);
    console.log(`   📋 Available ICAUT reserves: ${ethers.formatEther(availableReserves.availableIcaut)}`);
    console.log(`   🎯 System ready to mint up to ~$50M worth of IC tokens\n`);

    // Save deployment addresses
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, "hedera-testnet.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deployedContracts, null, 2));

    console.log("💾 Deployment addresses saved to:", deploymentFile);
    console.log("\n🎉 IC System deployment completed successfully!");
    console.log("\n📋 Contract Summary:");
    console.log("=".repeat(50));
    Object.entries(deployedContracts).forEach(([name, address]) => {
      if (typeof address === "string" && address.length > 0) {
        console.log(`${name.padEnd(20)}: ${address}`);
      }
    });
    console.log("=".repeat(50));

    console.log("\n👥 Account Configuration:");
    console.log("=".repeat(50));
    console.log(`Admin (0.0.6765425)     : ${ADMIN_ADDRESS}`);
    console.log(`Investor (0.0.6853844)  : ${INVESTOR_ADDRESS}`);
    console.log(`Advisor (0.0.6853851)   : ${ADVISOR_ADDRESS}`);
    console.log(`Team (0.0.6853855)      : ${TEAM_ADDRESS}`);
    console.log(`Custodian (0.0.6853913) : ${CUSTODIAN_ADDRESS}`);
    console.log(`Emergency Signer 1      : ${EMERGENCY_SIGNER1}`);
    console.log(`Emergency Signer 2      : ${EMERGENCY_SIGNER2}`);
    console.log("=".repeat(50));

    console.log("\n🔒 Security Setup:");
    console.log("✅ RESERVE_MANAGER_ROLE granted to Admin");
    console.log("✅ EMERGENCY_ROLE granted to both emergency signers");
    console.log("✅ MINTER_ROLE granted to ICController on reserve tokens");
    console.log("✅ KYC granted to VaultAndYield for staking operations");
    console.log("✅ Governance tokens distributed to all actors");
    console.log("✅ Initial oracle prices set ($101,000 BTC, $3,500 Gold)");
    console.log("✅ Large reserves pre-minted (~$50M worth for smooth testing)");

    console.log("\n🔗 Next Steps:");
    console.log("1. Verify contracts on Hedera explorer");
    console.log("2. Test emergency multisig functionality");
    console.log("3. Begin KYC onboarding process");
    console.log("4. Test IC minting (up to $50M ready without additional reserves)");
    console.log("5. Test complete governance flow with voting timelines");
    console.log("6. Test the complete user flow with staking");
    console.log("7. Test large-scale IC token operations with pre-minted reserves");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });
