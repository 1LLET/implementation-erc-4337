
import { ethers } from "hardhat";

async function main() {
    const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
    const PAYMASTER_ADDRESS = "0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95";
    const AMOUNT = "0.00003";

    console.log(`Depositing ${AMOUNT} ETH to Paymaster ${PAYMASTER_ADDRESS} on EntryPoint ${ENTRY_POINT_ADDRESS}...`);

    const entryPoint = await ethers.getContractAt("IEntryPoint", ENTRY_POINT_ADDRESS);

    // We need to verify if the artifact IEntryPoint exists. 
    // If not, we can use the ABI directly or try "EntryPoint".
    // Usually @account-abstraction/contracts provides EntryPoint or IEntryPoint.

    // Checking current signer balance
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Signer: ${signer.address}, Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther(AMOUNT)) {
        throw new Error("Insufficient funds in signer account");
    }

    const tx = await entryPoint.depositTo(PAYMASTER_ADDRESS, { value: ethers.parseEther(AMOUNT) });
    console.log(`Transaction sent: ${tx.hash}`);

    await tx.wait();
    console.log("Deposit successful!");

    const depositInfo = await entryPoint.balanceOf(PAYMASTER_ADDRESS);
    console.log(`New Paymaster Deposit Balance: ${ethers.formatEther(depositInfo)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
