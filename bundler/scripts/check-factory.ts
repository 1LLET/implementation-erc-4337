import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function main() {
    const client = createPublicClient({
        chain: base,
        transport: http()
    });

    const potentialFactories = [
        "0xe52553Fa5Cb212017b040c3678da2EC282963167", // The one currently crashing
        "0x9406Cc6185a346906296840746125a0E44976454", // Standard v0.6
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // EntryPoint (just to verify connection)
    ];

    console.log("Checking factories on Base Mainnet...");

    for (const address of potentialFactories) {
        const code = await client.getCode({ address: address as `0x${string}` });
        console.log(`Address ${address}: ${code ? "EXISTS (" + code.length + " bytes)" : "NO CODE"}`);
    }
}

main().catch(console.error);
