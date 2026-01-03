import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying all contracts with account:", deployer.address);
    console.log(
        "Account balance:",
        ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
        "ETH"
    );
    console.log("Network:", network.name);

    // Initialize nonce tracker
    let nonce = await ethers.provider.getTransactionCount(deployer.address);
    console.log(`Starting nonce: ${nonce}`);

    // Standard EntryPoint v0.6
    const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

    // 1. Deploy SmartAccountFactory
    console.log("\n1. Deploying SmartAccountFactory...");
    const SmartAccountFactory = await ethers.getContractFactory("SmartAccountFactory");
    const factory = await SmartAccountFactory.deploy(ENTRYPOINT_ADDRESS, { nonce: nonce++ });
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("   ✅ SmartAccountFactory deployed to:", factoryAddress);

    // 2. Deploy SponsorPaymaster
    console.log("\n2. Deploying SponsorPaymaster...");
    const SponsorPaymaster = await ethers.getContractFactory("SponsorPaymaster");
    const paymaster = await SponsorPaymaster.deploy(ENTRYPOINT_ADDRESS, { nonce: nonce++ });
    await paymaster.waitForDeployment();
    const paymasterAddress = await paymaster.getAddress();
    console.log("   ✅ SponsorPaymaster deployed to:", paymasterAddress);



    // 3. Fund Paymaster (Base & Gnosis)
    if (network.name === "base" || network.name === "gnosis") {
        console.log("\n3. Funding Paymaster (0.00002 ETH)...");
        try {
            const fundAmount = ethers.parseEther("0.00002");
            console.log(`   Attempting to deposit ${ethers.formatEther(fundAmount)} ETH...`);

            // Check if deployer has enough balance
            const balance = await ethers.provider.getBalance(deployer.address);
            if (balance > fundAmount * 2n) {
                const depositTx = await paymaster.deposit({ value: fundAmount, nonce: nonce++ });
                await depositTx.wait();
                console.log("   ✅ Deposited:", ethers.formatEther(fundAmount), "ETH");
            } else {
                console.log("   ⚠️  Skipping deposit: Insufficient deployer balance.");
            }
        } catch (err: any) {
            console.log("   ⚠️  Deposit failed:", err.message);
        }
    } else {
        console.log("\n3. Funding Paymaster... SKIPPED (Not Base/Gnosis)");
    }

    // 4. Update deployments.json
    console.log("\n4. Updating deployments.json...");
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    let deployments: Record<string, any> = {};

    if (fs.existsSync(deploymentsPath)) {
        try {
            deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
        } catch (e) {
            console.warn("   Could not parse deployments.json, starting fresh.");
        }
    }

    if (!deployments[network.name]) {
        deployments[network.name] = {};
    }

    deployments[network.name] = {
        ...deployments[network.name],
        SponsorPaymaster: paymasterAddress,
        SmartAccountFactory: factoryAddress,
        EntryPoint: ENTRYPOINT_ADDRESS
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`   ✅ Saved to ${deploymentsPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`Network:             ${network.name}`);
    console.log(`SmartAccountFactory: ${factoryAddress}`);
    console.log(`SponsorPaymaster:    ${paymasterAddress}`);
    console.log(`EntryPoint:          ${ENTRYPOINT_ADDRESS}`);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
