import { createPublicClient, http, encodeFunctionData } from "viem";
import { base } from "viem/chains";
import { entryPointAbi, factoryAbi } from "../../frontend/src/config/contracts";

// Configuration
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY_ADDRESS = "0x99003d6dE73aFc3EFefe6c1bb7A01073f7eCf83B"; // Your deployed factory
const PAYMASTER_ADDRESS = "0xc88fAbc20e88Cb7B0BF2B6cF276ee22535448595"; // Your deployed paymaster

async function main() {
    const client = createPublicClient({
        chain: base,
        transport: http("https://base.publicnode.com"),
    });

    console.log("--- Estimating Deployment Cost on Base ---");

    // 1. Get Gas Price
    const gasPrice = await client.getGasPrice();
    console.log(`Current Gas Price: ${Number(gasPrice) / 1e9} Gwei`);

    // 2. Estimate Gas for verify+call (approximate for deployment)
    // A typical deployment UserOp is around 300k - 500k gas depending on the factory
    const estimatedGasLimit = 500_000n;

    // Cost = Gas Limit * Gas Price
    const estimatedCost = estimatedGasLimit * gasPrice;
    const estimatedCostEth = Number(estimatedCost) / 1e18;

    console.log(`\nApproximate Gas Needed: ${estimatedGasLimit.toString()}`);
    console.log(`Estimated Cost: ${estimatedCostEth.toFixed(6)} ETH`);

    // Add a safety buffer (e.g. 2x or 3x) for the Paymaster deposit
    const recommendedDeposit = estimatedCostEth * 5;
    console.log(`\nRecommended Paymaster Deposit: ${recommendedDeposit.toFixed(6)} ETH`);
    console.log(`(This covers the deployment and a few transactions)`);
}

main().catch(console.error);
