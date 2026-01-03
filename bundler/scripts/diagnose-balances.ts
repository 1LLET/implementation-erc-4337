import { createPublicClient, http, formatEther, parseAbi } from "viem";
import { base } from "viem/chains";
import "dotenv/config";

// Addresses from your recent logs
const BUNDLER_ADDRESS = "0x0b00a75637601e0F1B98d7B79b28A77c1f64E16D"; // From error log
const PAYMASTER_ADDRESS = "0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95"; // From deploy logs
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

// EntryPoint ABI for checking deposit
const ENTRYPOINT_ABI = parseAbi([
    "function balanceOf(address account) view returns (uint256)",
    "function getDepositInfo(address account) view returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)"
]);

async function main() {
    const client = createPublicClient({
        chain: base,
        transport: http("https://base.publicnode.com"),
    });

    console.log("--- 🕵️‍♂️ Wallet Balance Diagnosis (Base) ---");

    // 1. Check Bundler Balance (The one who executes the tx)
    const bundlerBal = await client.getBalance({ address: BUNDLER_ADDRESS });
    console.log(`\n🤖 Bundler Wallet (${BUNDLER_ADDRESS})`);
    console.log(`   Balance: ${formatEther(bundlerBal)} ETH`);
    if (bundlerBal < 10000000000000n) { // < 0.00001 ETH
        console.log("   ❌ CRITICAL: Bundler has no ETH to pay for gas! Fund this address.");
    } else {
        console.log("   ✅ Balance looks okay to start.");
    }

    // 2. Check Paymaster Deposit (The one who refunds the Bundler)
    const [deposit] = await client.readContract({
        address: ENTRYPOINT_ADDRESS,
        abi: ENTRYPOINT_ABI,
        functionName: "getDepositInfo",
        args: [PAYMASTER_ADDRESS]
    });
    console.log(`\n🏦 Paymaster Deposit (in EntryPoint)`);
    console.log(`   Paymaster: ${PAYMASTER_ADDRESS}`);
    console.log(`   Deposit:   ${formatEther(deposit)} ETH`);

    if (deposit < 5000000000000n) { // < 0.000005 ETH
        console.log("   ⚠️  Deposit is very low. Might fail large txs.");
    } else {
        console.log("   ✅ Deposit looks good.");
    }

    console.log("\n--- Recommendation ---");
    if (bundlerBal === 0n) {
        console.log(`👉 Send ETH (e.g. 0.001 ETH) to the BUNDLER address: ${BUNDLER_ADDRESS}`);
        console.log("   The Bundler pays the initial gas fee to the network, then gets refunded by the Paymaster.");
    }
}

main().catch(console.error);
