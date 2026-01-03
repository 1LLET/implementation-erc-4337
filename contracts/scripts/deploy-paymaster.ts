import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  // Deploy SponsorPaymaster
  console.log("\nDeploying SponsorPaymaster...");
  const SponsorPaymaster = await ethers.getContractFactory("SponsorPaymaster");
  // Constructor only takes entryPoint now
  const paymaster = await SponsorPaymaster.deploy(ENTRYPOINT_ADDRESS);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();

  console.log("SponsorPaymaster deployed to:", paymasterAddress);

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

  deployments[network.name]["SponsorPaymaster"] = paymasterAddress;
  deployments[network.name]["EntryPoint"] = ENTRYPOINT_ADDRESS; // Useful context

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`Saved deployment to ${deploymentsPath}`);



  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:           ${network.name}`);
  console.log(`SponsorPaymaster:  ${paymasterAddress}`);
  console.log(`EntryPoint:        ${ENTRYPOINT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
