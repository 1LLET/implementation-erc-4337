import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // EntryPoint v0.6 address on Base Sepolia
  const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  console.log("\nUsing EntryPoint:", ENTRYPOINT_ADDRESS);

  // Deploy SmartAccountFactory
  console.log("\n1. Deploying SmartAccountFactory...");
  const SmartAccountFactory = await ethers.getContractFactory(
    "SmartAccountFactory"
  );
  const factory = await SmartAccountFactory.deploy(ENTRYPOINT_ADDRESS);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   SmartAccountFactory deployed to:", factoryAddress);

  // Deploy SponsorPaymaster with 0.01 ETH daily limit per account
  console.log("\n2. Deploying SponsorPaymaster...");
  const dailyLimit = ethers.parseEther("0.01"); // 0.01 ETH daily limit
  const SponsorPaymaster =
    await ethers.getContractFactory("SponsorPaymaster");
  const paymaster = await SponsorPaymaster.deploy(
    ENTRYPOINT_ADDRESS,
    dailyLimit
  );
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log("   SponsorPaymaster deployed to:", paymasterAddress);
  console.log("   Daily limit:", ethers.formatEther(dailyLimit), "ETH");

  // Fund the Paymaster in the EntryPoint
  console.log("\n3. Funding Paymaster in EntryPoint...");
  const fundAmount = ethers.parseEther("0.1"); // 0.1 ETH
  const depositTx = await paymaster.deposit({ value: fundAmount });
  await depositTx.wait();
  console.log("   Deposited:", ethers.formatEther(fundAmount), "ETH");

  // Verify deposit
  const deposit = await paymaster.getDeposit();
  console.log("   Paymaster deposit balance:", ethers.formatEther(deposit), "ETH");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network: Base Sepolia (chainId: 84532)");
  console.log("\nContract Addresses:");
  console.log("  EntryPoint:          ", ENTRYPOINT_ADDRESS);
  console.log("  SmartAccountFactory: ", factoryAddress);
  console.log("  SponsorPaymaster:    ", paymasterAddress);
  console.log("\nPaymaster Status:");
  console.log("  Daily Limit:         ", ethers.formatEther(dailyLimit), "ETH");
  console.log("  Deposit Balance:     ", ethers.formatEther(deposit), "ETH");
  console.log("=".repeat(60));

  console.log("\n--- Environment Variables ---");
  console.log(`FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`PAYMASTER_ADDRESS=${paymasterAddress}`);
  console.log(`ENTRYPOINT_ADDRESS=${ENTRYPOINT_ADDRESS}`);

  console.log("\n--- Verification Commands ---");
  console.log(
    `npx hardhat verify --network baseSepolia ${factoryAddress} "${ENTRYPOINT_ADDRESS}"`
  );
  console.log(
    `npx hardhat verify --network baseSepolia ${paymasterAddress} "${ENTRYPOINT_ADDRESS}" "${dailyLimit}"`
  );

  console.log("\n--- Next Steps ---");
  console.log("1. Update bundler/.env with the contract addresses above");
  console.log("2. Update frontend/.env.local with the contract addresses");
  console.log("3. Whitelist Smart Accounts in the Paymaster");
  console.log(
    '   Example: paymaster.setWhitelisted("0xSmartAccountAddress", true)'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
