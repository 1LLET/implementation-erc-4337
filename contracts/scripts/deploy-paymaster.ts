import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const FACTORY_ADDRESS = "0xe52553Fa5Cb212017b040c3678da2EC282963167";

  // Deploy SponsorPaymaster with 0.01 ETH daily limit per account
  console.log("\nDeploying SponsorPaymaster...");
  const dailyLimit = ethers.parseEther("0.01");
  const SponsorPaymaster = await ethers.getContractFactory("SponsorPaymaster");
  const paymaster = await SponsorPaymaster.deploy(ENTRYPOINT_ADDRESS, dailyLimit);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log("SponsorPaymaster deployed to:", paymasterAddress);
  console.log("Daily limit:", ethers.formatEther(dailyLimit), "ETH");

  // Fund the Paymaster in the EntryPoint
  console.log("\nFunding Paymaster in EntryPoint...");
  const fundAmount = ethers.parseEther("0.005"); // 0.005 ETH (conservative)
  const depositTx = await paymaster.deposit({ value: fundAmount });
  await depositTx.wait();
  console.log("Deposited:", ethers.formatEther(fundAmount), "ETH");

  // Verify deposit
  const deposit = await paymaster.getDeposit();
  console.log("Paymaster deposit balance:", ethers.formatEther(deposit), "ETH");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  EntryPoint:          ", ENTRYPOINT_ADDRESS);
  console.log("  SmartAccountFactory: ", FACTORY_ADDRESS);
  console.log("  SponsorPaymaster:    ", paymasterAddress);
  console.log("\n--- Environment Variables ---");
  console.log(`FACTORY_ADDRESS=${FACTORY_ADDRESS}`);
  console.log(`PAYMASTER_ADDRESS=${paymasterAddress}`);
  console.log(`ENTRYPOINT_ADDRESS=${ENTRYPOINT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
