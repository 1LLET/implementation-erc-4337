import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function main() {
    const client = createPublicClient({
        chain: base,
        transport: http("https://base.publicnode.com") // Testing alternate RPC
    });

    const factoryAddress = "0x99003d6dE73aFc3EFefe6c1bb7A01073f7eCf83B";

    console.log(`Checking code at ${factoryAddress} on Base Mainnet...`);

    const code = await client.getCode({ address: factoryAddress as `0x${string}` });
    console.log(`Code: ${code ? "EXISTS (" + code.length + " bytes)" : "NO CODE (0x)"}`);

    if (!code || code === "0x") {
        console.error("CRITICAL: Contract is NOT deployed on this chain/RPC.");
    } else {
        console.log("Contract is deployed.");
    }
}

main().catch(console.error);
