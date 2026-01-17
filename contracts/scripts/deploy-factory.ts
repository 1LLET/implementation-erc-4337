import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SmartAccountFactory with account:", deployer.address);
    console.log("Network:", network.name);

    const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

    // Check Balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

    const SmartAccountFactory = await ethers.getContractFactory("SmartAccountFactory");
    const deploymentTx = await SmartAccountFactory.getDeployTransaction(ENTRYPOINT_ADDRESS);

    /*try {
        const gasEstimate = await ethers.provider.estimateGas(deploymentTx);
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice ?? 1n; // Default to 1 wei if null
        const estimatedCost = gasEstimate * gasPrice;

        console.log("\nEstimated Gas:", gasEstimate.toString());
        console.log("Current Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
        console.log("Estimated Cost:", ethers.formatEther(estimatedCost), "ETH");

        if (balance < estimatedCost) {
            console.error(`\n❌ INSUFFICIENT FUNDS! Needed: ${ethers.formatEther(estimatedCost)}, Available: ${ethers.formatEther(balance)}`);
        } else {
            console.log("✅ Funds sufficient for estimated cost.");
        }
    } catch (error) {
        console.warn("Could not estimate gas (likely insufficient funds or RPC issue):", error);
    }*/

    // Deploy SmartAccountFactory
    console.log("\nDeploying SmartAccountFactory...");
    const factory = await SmartAccountFactory.deploy(ENTRYPOINT_ADDRESS);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("SmartAccountFactory deployed to:", factoryAddress);

    // Save to deployments.json
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    let deployments: Record<string, any> = {};

    if (fs.existsSync(deploymentsPath)) {
        try {
            deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
        } catch (e) {
            console.warn("Could not parse deployments.json, starting fresh.");
        }
    }

    if (!deployments[network.name]) {
        deployments[network.name] = {};
    }

    deployments[network.name]["SmartAccountFactory"] = factoryAddress;
    // Ensure EntryPoint is also set
    deployments[network.name]["EntryPoint"] = ENTRYPOINT_ADDRESS;

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`Saved deployment to ${deploymentsPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network:             ${network.name}`);
    console.log(`SmartAccountFactory: ${factoryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
