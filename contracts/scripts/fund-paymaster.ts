import { ethers } from "hardhat";

async function main() {
  const PAYMASTER_ADDRESS = "0x30a426c96f2F08d3fa29a3c350D1b01E16F5a6B5";

  const paymaster = await ethers.getContractAt("SponsorPaymaster", PAYMASTER_ADDRESS);

  console.log("Funding Paymaster...");
  const tx = await paymaster.deposit({ value: ethers.parseEther("0.001") });
  await tx.wait();
  console.log("Funded paymaster with 0.001 ETH");

  const bal = await paymaster.getDeposit();
  console.log("Current deposit:", ethers.formatEther(bal), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
