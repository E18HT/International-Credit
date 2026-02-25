import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🪙 Starting IC token minting process...");
  
  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/hedera-testnet.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please deploy contracts first.");
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📋 Loaded deployment addresses from:", deploymentPath);
  
  // Get signer (should be the admin account)
  const [admin] = await ethers.getSigners();
  console.log("👤 Using admin account:", admin.address);
  console.log("💰 Admin balance:", ethers.formatEther(await admin.provider.getBalance(admin.address)), "ETH");
  
  // Connect to contracts
  const icController = await ethers.getContractAt("ICController", deployment.ICController);
  const ic = await ethers.getContractAt("IC", deployment.IC);
  
  // Target address and amount - MODIFY THESE VALUES AS NEEDED
  const targetAddress = "0x882Ca851dF845876f1bE326E0d5D1BFc40f8862e"; // Change this address
  const mintAmount = ethers.parseEther("50"); // Change this amount
  
  console.log(`\n🎯 Minting ${ethers.formatEther(mintAmount)} IC tokens to: ${targetAddress}`);
  
  try {
    // Step 1: Grant KYC to the target address (admin can do this directly)
    console.log("\n1️⃣ Granting KYC approval to target address...");
    const kycTx = await icController.connect(admin).grantKyc(targetAddress);
    await kycTx.wait();
    console.log("   ✅ KYC granted successfully");
    
    // Step 2: Check if target has KYC
    const hasKyc = await icController.isKycPassed(targetAddress);
    console.log("   📋 KYC Status:", hasKyc ? "✅ APPROVED" : "❌ NOT APPROVED");
    
    if (!hasKyc) {
      throw new Error("KYC approval failed");
    }
    
    // Step 3: Check available reserves before minting
    console.log("\n2️⃣ Checking available reserves...");
    const availableReserves = await icController.getAvailableReserves();
    console.log("   📊 Available ICBTC reserves:", ethers.formatEther(availableReserves.availableIcbtc));
    console.log("   📊 Available ICAUT reserves:", ethers.formatEther(availableReserves.availableIcaut));
    
    // Step 4: Get reserve info before minting
    const reserveInfoBefore = await icController.getReserveInfo();
    console.log("\n📊 Reserve status before minting:");
    console.log("   💰 Total IC minted:", ethers.formatEther(reserveInfoBefore.totalMinted));
    console.log("   🔸 ICBTC reserves:", ethers.formatEther(reserveInfoBefore.icbtcReserves));
    console.log("   🔸 ICAUT reserves:", ethers.formatEther(reserveInfoBefore.icautReserves));
    
    // Step 5: Mint IC tokens
    console.log("\n3️⃣ Minting IC tokens...");
    const mintTx = await icController.connect(admin).mintBackedIc(targetAddress, mintAmount);
    console.log("   📝 Transaction submitted:", mintTx.hash);
    
    const receipt = await mintTx.wait();
    console.log("   ✅ Transaction confirmed in block:", receipt?.blockNumber);
    
    // Step 6: Verify minting results
    console.log("\n4️⃣ Verifying minting results...");
    const userBalance = await ic.balanceOf(targetAddress);
    console.log("   💰 User IC balance:", ethers.formatEther(userBalance));
    
    const reserveInfoAfter = await icController.getReserveInfo();
    console.log("\n📊 Reserve status after minting:");
    console.log("   💰 Total IC minted:", ethers.formatEther(reserveInfoAfter.totalMinted));
    console.log("   🔸 ICBTC reserves:", ethers.formatEther(reserveInfoAfter.icbtcReserves));
    console.log("   🔸 ICAUT reserves:", ethers.formatEther(reserveInfoAfter.icautReserves));
    
    // Step 7: Calculate reserve backing
    const totalReserveValue = await icController.getTotalReserveValue();
    const icValue = await icController.getCurrentIcValue();
    console.log("\n💎 System valuation:");
    console.log("   📈 Total reserve value: $" + ethers.formatEther(totalReserveValue));
    console.log("   💵 Current IC value: $" + ethers.formatEther(icValue));
    
    // Parse the minting event to show exact amounts
    const mintEvent = receipt?.logs.find(log => {
      try {
        const parsed = icController.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        return parsed?.name === "IcMinted";
      } catch {
        return false;
      }
    });
    
    if (mintEvent) {
      const parsed = icController.interface.parseLog({
        topics: mintEvent.topics as string[],
        data: mintEvent.data
      });
      if (parsed) {
        console.log("\n🎉 Minting Event Details:");
        console.log("   👤 Recipient:", parsed.args.to);
        console.log("   💰 IC Amount:", ethers.formatEther(parsed.args.icAmount));
        console.log("   🔸 ICBTC Amount:", ethers.formatEther(parsed.args.icbtcAmount));
        console.log("   🔸 ICAUT Amount:", ethers.formatEther(parsed.args.icautAmount));
      }
    }
    
    console.log("\n✅ IC token minting completed successfully!");
    console.log("==================================================");
    console.log(`🎯 ${ethers.formatEther(mintAmount)} IC tokens minted to: ${targetAddress}`);
    console.log(`📋 Transaction hash: ${mintTx.hash}`);
    console.log("==================================================");
    
  } catch (error: any) {
    console.error("\n❌ Minting failed:");
    console.error("Error:", error.message);
    
    if (error.message.includes("Insufficient available")) {
      console.log("\n💡 Suggestion: You may need to pre-mint more reserves first.");
      console.log("Run: npx hardhat run scripts/pre-mint-reserves.ts --network hedera");
    }
    
    throw error;
  }
}

// Usage Instructions:
// 1. Edit the targetAddress and mintAmount variables above
// 2. Run: npx hardhat run scripts/mint-ic.ts --network hedera
// 
// Examples:
// - Mint 100 IC: const mintAmount = ethers.parseEther("100");
// - Mint 1000 IC: const mintAmount = ethers.parseEther("1000");
// - Different address: const targetAddress = "0x...";

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
