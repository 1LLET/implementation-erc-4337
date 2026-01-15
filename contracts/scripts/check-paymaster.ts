import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found");
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const networkName = network.name;

  if (!deployments[networkName] || !deployments[networkName]["SponsorPaymaster"]) {
    throw new Error(`SponsorPaymaster not found for network: ${networkName}`);
  }

  const PAYMASTER_ADDRESS = deployments[networkName]["SponsorPaymaster"];
  // Use configured EntryPoint or default
  const ENTRYPOINT_ADDRESS = deployments[networkName]["EntryPoint"] || "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  console.log(`Checking Paymaster on ${networkName}`);
  console.log(`Paymaster Address: ${PAYMASTER_ADDRESS}`);
  console.log(`EntryPoint Address: ${ENTRYPOINT_ADDRESS}`);

  const paymaster = await ethers.getContractAt("SponsorPaymaster", PAYMASTER_ADDRESS);
  const entryPoint = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    ENTRYPOINT_ADDRESS
  );

  const depositViaPaymaster = await paymaster.getDeposit();
  const depositViaEntryPoint = await entryPoint.balanceOf(PAYMASTER_ADDRESS);

  console.log("Paymaster deposit (via paymaster.getDeposit()):", ethers.formatEther(depositViaPaymaster), "ETH");
  console.log("Paymaster deposit (via entryPoint.balanceOf()):", ethers.formatEther(depositViaEntryPoint), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
