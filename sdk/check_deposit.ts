
import { createPublicClient, http, parseAbi, formatEther } from 'viem';
import { base } from 'viem/chains';

const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const PAYMASTER_ADDRESS = '0x1e13Eb16C565E3f3FDe49A011755e50410bb1F95';

const abi = parseAbi([
    'function balanceOf(address account) external view returns (uint256)',
    'function deposits(address account) external view returns (uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)'
]);

async function checkDeposit() {
    const client = createPublicClient({
        chain: base,
        transport: http()
    });

    try {
        console.log(`Checking deposit for Paymaster: ${PAYMASTER_ADDRESS}`);
        console.log(`On EntryPoint: ${ENTRY_POINT_ADDRESS}`);

        // balanceOf on EntryPoint returns the deposit
        const balance = await client.readContract({
            address: ENTRY_POINT_ADDRESS,
            abi: abi,
            functionName: 'balanceOf',
            args: [PAYMASTER_ADDRESS]
        });

        console.log(`Deposit Balance: ${formatEther(balance)} ETH`);

        // Also check deposits struct for more info
        const depositInfo = await client.readContract({
            address: ENTRY_POINT_ADDRESS,
            abi: abi,
            functionName: 'deposits',
            args: [PAYMASTER_ADDRESS]
        });

        console.log('Deposit Info:', depositInfo);

    } catch (error) {
        console.error('Error checking deposit:', error);
    }
}

checkDeposit();
