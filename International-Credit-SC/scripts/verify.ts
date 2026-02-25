import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔍 Starting contract verification...\n");

  // Load deployment addresses
  const deploymentFile = path.join(__dirname, "..", "deployments", "hedera-testnet.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error("Deployment file not found. Please deploy contracts first.");
  }

  const deployedContracts = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  console.log("📋 Loaded deployment addresses:");
  Object.entries(deployedContracts).forEach(([name, address]) => {
    if (typeof address === "string" && address.length > 0) {
      console.log(`${name.padEnd(20)}: ${address}`);
    }
  });
  console.log();

  // Get environment variables
  const {
    ADMIN_ADDRESS,
    INVESTOR_ADDRESS,
    ADVISOR_ADDRESS,
    TEAM_ADDRESS,
    CUSTODIAN_ADDRESS,
    SIGNER1_ADDRESS,
    SIGNER2_ADDRESS
  } = process.env;

  if (!ADMIN_ADDRESS || !INVESTOR_ADDRESS || !ADVISOR_ADDRESS || !TEAM_ADDRESS || !CUSTODIAN_ADDRESS) {
    throw new Error("Missing required environment variables for verification.");
  }

  const EMERGENCY_SIGNER1 = SIGNER1_ADDRESS || ADMIN_ADDRESS;
  const EMERGENCY_SIGNER2 = SIGNER2_ADDRESS || INVESTOR_ADDRESS;

  try {
    console.log("🔐 Verifying contract states...\n");

    // Verify MockOracle
    console.log("1️⃣ Verifying MockOracle...");
    const mockOracle = await ethers.getContractAt("MockOracle", deployedContracts.MockOracle);
    const btcPrice = await mockOracle.btcPrice();
    const goldPrice = await mockOracle.goldPrice();
    const oracleOwner = await mockOracle.owner();
    
    console.log(`   BTC Price: $${ethers.formatUnits(btcPrice, 8)}`);
    console.log(`   Gold Price: $${ethers.formatUnits(goldPrice, 8)}`);
    console.log(`   Owner: ${oracleOwner}`);
    console.log(`   ✅ MockOracle verified\n`);

    // Verify ICBTC
    console.log("2️⃣ Verifying ICBTC...");
    const icbtc = await ethers.getContractAt("ICBTC", deployedContracts.ICBTC);
    const icbtcName = await icbtc.name();
    const icbtcSymbol = await icbtc.symbol();
    const icbtcSupply = await icbtc.totalSupply();
    const icbtcController = await icbtc.icController();
    
    console.log(`   Name: ${icbtcName}`);
    console.log(`   Symbol: ${icbtcSymbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(icbtcSupply)}`);
    console.log(`   IC Controller: ${icbtcController}`);
    console.log(`   ✅ ICBTC verified\n`);

    // Verify ICAUT
    console.log("3️⃣ Verifying ICAUT...");
    const icaut = await ethers.getContractAt("ICAUT", deployedContracts.ICAUT);
    const icautName = await icaut.name();
    const icautSymbol = await icaut.symbol();
    const icautSupply = await icaut.totalSupply();
    const icautController = await icaut.icController();
    
    console.log(`   Name: ${icautName}`);
    console.log(`   Symbol: ${icautSymbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(icautSupply)}`);
    console.log(`   IC Controller: ${icautController}`);
    console.log(`   ✅ ICAUT verified\n`);

    // Verify IC
    console.log("4️⃣ Verifying IC...");
    const ic = await ethers.getContractAt("IC", deployedContracts.IC);
    const icName = await ic.name();
    const icSymbol = await ic.symbol();
    const icSupply = await ic.totalSupply();
    const icControllerAddr = await ic.icController();
    
    console.log(`   Name: ${icName}`);
    console.log(`   Symbol: ${icSymbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(icSupply)}`);
    console.log(`   IC Controller: ${icControllerAddr}`);
    console.log(`   ✅ IC verified\n`);

    // Verify ICGOVT
    console.log("5️⃣ Verifying ICGOVT...");
    const icgovt = await ethers.getContractAt("ICGOVT", deployedContracts.ICGOVT);
    const icgovtName = await icgovt.name();
    const icgovtSymbol = await icgovt.symbol();
    const icgovtSupply = await icgovt.totalSupply();
    
    console.log(`   Name: ${icgovtName}`);
    console.log(`   Symbol: ${icgovtSymbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(icgovtSupply)}`);
    
    // Check governance token distribution
    const investorBalance = await icgovt.balanceOf(INVESTOR_ADDRESS);
    const advisorBalance = await icgovt.balanceOf(ADVISOR_ADDRESS);
    const teamBalance = await icgovt.balanceOf(TEAM_ADDRESS);
    const custodianBalance = await icgovt.balanceOf(CUSTODIAN_ADDRESS);
    
    console.log(`   Investor Balance: ${ethers.formatEther(investorBalance)}`);
    console.log(`   Advisor Balance: ${ethers.formatEther(advisorBalance)}`);
    console.log(`   Team Balance: ${ethers.formatEther(teamBalance)}`);
    console.log(`   Custodian Balance: ${ethers.formatEther(custodianBalance)}`);
    console.log(`   ✅ ICGOVT verified\n`);

    // Verify ICController
    console.log("6️⃣ Verifying ICController...");
    const icController = await ethers.getContractAt("ICController", deployedContracts.ICController);
    const reserveInfo = await icController.getReserveInfo();
    const totalReserveValue = await icController.getTotalReserveValue();
    
    console.log(`   ICBTC Reserves: ${ethers.formatEther(reserveInfo.icbtcReserves)}`);
    console.log(`   ICAUT Reserves: ${ethers.formatEther(reserveInfo.icautReserves)}`);
    console.log(`   Total IC Minted: ${ethers.formatEther(reserveInfo.totalMinted)}`);
    console.log(`   Total Reserve Value: $${ethers.formatUnits(totalReserveValue, 8)}`);
    console.log(`   ✅ ICController verified\n`);

    // Verify GovernanceController
    console.log("7️⃣ Verifying GovernanceController...");
    const governance = await ethers.getContractAt("GovernanceController", deployedContracts.GovernanceController);
    const actors = await governance.getActors();
    const proposalCount = await governance.getProposalCount();
    
    console.log(`   Investor: ${actors[0]}`);
    console.log(`   Advisor: ${actors[1]}`);
    console.log(`   Team: ${actors[2]}`);
    console.log(`   Custodian: ${actors[3]}`);
    console.log(`   Proposal Count: ${proposalCount}`);
    console.log(`   ✅ GovernanceController verified\n`);

    // Verify VaultAndYield
    console.log("8️⃣ Verifying VaultAndYield...");
    const vault = await ethers.getContractAt("VaultAndYield", deployedContracts.VaultAndYield);
    const tvl = await vault.getTotalValueLocked();
    const supportedDurations = await vault.getSupportedDurations();
    
    console.log(`   Total Value Locked: ${ethers.formatEther(tvl)} IC`);
    console.log(`   Supported Durations: ${supportedDurations.durations.length}`);
    console.log(`   ✅ VaultAndYield verified\n`);

    // Verify role assignments
    console.log("🔐 Verifying role assignments...");
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const COMPLIANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_ROLE"));
    const RESERVE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESERVE_MANAGER_ROLE"));

    const icControllerHasIcbtcMinter = await icbtc.hasRole(MINTER_ROLE, deployedContracts.ICController);
    const icControllerHasIcautMinter = await icaut.hasRole(MINTER_ROLE, deployedContracts.ICController);
    const adminHasReserveManager = await icController.hasRole(RESERVE_MANAGER_ROLE, ADMIN_ADDRESS);

    console.log(`   ICController has ICBTC minter role: ${icControllerHasIcbtcMinter ? '✅' : '❌'}`);
    console.log(`   ICController has ICAUT minter role: ${icControllerHasIcautMinter ? '✅' : '❌'}`);
    console.log(`   Admin has reserve manager role: ${adminHasReserveManager ? '✅' : '❌'}`);

    // Verify VaultAndYield KYC
    const vaultHasKyc = await icController.isKycPassed(deployedContracts.VaultAndYield);
    console.log(`   VaultAndYield has KYC approval: ${vaultHasKyc ? '✅' : '❌'}`);

    // Verify Emergency Roles
    console.log("\n🚨 Emergency Role Verification:");
    const icEmergency = await ethers.getContractAt("IC", deployedContracts.IC);
    const EMERGENCY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EMERGENCY_ROLE"));
    
    const signer1HasEmergency = await icEmergency.hasRole(EMERGENCY_ROLE, EMERGENCY_SIGNER1);
    const signer2HasEmergency = await icEmergency.hasRole(EMERGENCY_ROLE, EMERGENCY_SIGNER2);
    
    console.log(`   Emergency Signer 1 (${EMERGENCY_SIGNER1}): ${signer1HasEmergency ? '✅' : '❌'}`);
    console.log(`   Emergency Signer 2 (${EMERGENCY_SIGNER2}): ${signer2HasEmergency ? '✅' : '❌'}`);
    
    // Check IC token states
    const icPaused = await icEmergency.paused();
    const mintingFrozen = await icEmergency.mintingFrozen();
    
    console.log(`   IC Token Paused: ${icPaused ? '⚠️ YES' : '✅ NO'}`);
    console.log(`   Minting Frozen: ${mintingFrozen ? '⚠️ YES' : '✅ NO'}`);

    console.log("\n🎉 Contract verification completed successfully!");
    
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
    
    console.log("\n📊 System Summary:");
    console.log("=".repeat(50));
    console.log(`Total ICGOVT Supply: ${ethers.formatEther(icgovtSupply)} tokens`);
    console.log(`Total IC Minted: ${ethers.formatEther(reserveInfo.totalMinted)} tokens`);
    console.log(`Total Reserve Value: $${ethers.formatUnits(totalReserveValue, 8)}`);
    console.log(`Active Proposals: ${proposalCount}`);
    console.log(`Staking TVL: ${ethers.formatEther(tvl)} IC`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });
