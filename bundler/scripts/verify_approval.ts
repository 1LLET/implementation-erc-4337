import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parseEther } from "viem";
import { fundAndApprove, getApprovalAction } from "../src/services/approvalService.js";
import { config } from "../src/config.js";

async function main() {
    console.log("Starting Approval Flow Verification...");

    // Generate a random EOA
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    console.log(`Generated EOA: ${account.address}`);

    // Test Token (Mock address - replace with real one for actual test)
    const TEST_TOKEN = "0xTOKEN_ADDRESS";
    const SPENDER = config.entryPointAddress; // Approving EntryPoint as an example

    // Mocking the action check (since we might not have a real token on local/testnet freely available without config)
    console.log("\n--- Checking Approval Action ---");
    try {
        const action = await getApprovalAction(TEST_TOKEN, account.address, SPENDER, parseEther("10"));
        console.log("Action determined:", action);
    } catch (error) {
        console.log("Error checking action (expected if token address is invalid):", error.message);
    }

    // To test the full flow, we need a valid token and RPC connection.
    // This script serves as a template for manual verification.
    console.log("\nTo verify with a real token:");
    console.log("1. Edit this script to set TEST_TOKEN to a valid ERC20 address.");
    console.log("2. Ensure .env has valid RPC_URL and BUNDLER_PRIVATE_KEY.");
    console.log("3. Run: ts-node src/scripts/verify_approval.ts");
}

main().catch(console.error);
