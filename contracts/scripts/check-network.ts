import { ethers, network } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    const provider = ethers.provider;
    const networkDetails = await provider.getNetwork();

    console.log("--- Hardhat Network Diagnosis ---");
    console.log(`Configured Network Name: ${network.name}`);
    console.log(`Actual Connected Chain ID: ${networkDetails.chainId}`);
    console.log(`Deployer Address: ${deployer.address}`);
    console.log(`Deployer Balance: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH`);

    if (network.name === 'base' && networkDetails.chainId !== 8453n) {
        console.error("CRITICAL MISMATCH: You are running on 'base' network but Chain ID is not 8453!");
    } else if (network.name === 'base' && networkDetails.chainId === 8453n) {
        console.log("SUCCESS: Connected to Base Mainnet (Chain ID 8453).");
    }

    const factoryAddress = "0x99003d6dE73aFc3EFefe6c1bb7A01073f7eCf83B";
    const code = await provider.getCode(factoryAddress);
    console.log(`Code at ${factoryAddress} via Hardhat Provider: ${code.length > 2 ? "EXISTS" : "NO CODE"}`);
}

main().catch(console.error);
