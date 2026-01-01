import { ethers } from "hardhat";

async function main() {
  const PAYMASTER_ADDRESS = "0xE4D1ab09814c07C580B4C2c3d4dc9C3110D57F54";
  const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

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
