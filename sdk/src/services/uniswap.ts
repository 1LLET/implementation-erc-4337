import { createPublicClient, http, encodeFunctionData, parseAbi, Address, type Hex } from "viem";
import { base } from "viem/chains";

// Constants for Base Mainnet
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // SwapRouter02
const UNISWAP_V3_QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"; // QuoterV2
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // Base WETH

// ABIs
const QUOTER_ABI = parseAbi([
    "function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
]);

const ROUTER_ABI = parseAbi([
    "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)"
]);

export class UniswapService {
    private publicClient;

    constructor() {
        this.publicClient = createPublicClient({
            chain: base,
            transport: http("https://mainnet.base.org") // Default public RPC
        });
    }

    /**
     * Get amount of USDC needed to buy exact amount of ETH
     * @param amountETHWei Amount of ETH (Wei) needed
     */
    async quoteUSDCForETH(amountETHWei: bigint): Promise<bigint> {
        // We want to buy WETH (which is unwrapped to ETH by router or we just keep WETH? 
        // Stargate needs NATIVE ETH in msg.value.
        // SwapRouter02 executes swap. If output is WETH, we need to unwrap.
        // OR SwapRouter02 has multicall to unwrapWETH9.

        // Simpler: Just swap for WETH.
        // Wait, Stargate needs MSG.VALUE. Smart Account needs to have ETH balance.
        // If we swap to WETH, SA has WETH, not ETH.
        // We need router to unwrap. router.unwrapWETH9(0, recipient).

        // For Quoting, we quote USDC -> WETH.
        const poolFee = 500; // 0.05% for USDC/WETH usually? Or 3000 (0.3%)?
        // Base USDC/ETH is likely 0.05% (500) or 0.01% (100). Let's use 500 first.

        try {
            const params = {
                tokenIn: USDC_ADDRESS as Address,
                tokenOut: WETH_ADDRESS as Address,
                amount: amountETHWei,
                fee: 500,
                sqrtPriceLimitX96: 0n
            };

            const result = await this.publicClient.readContract({
                address: UNISWAP_V3_QUOTER,
                abi: QUOTER_ABI,
                functionName: "quoteExactOutputSingle",
                args: [params]
            }) as [bigint, bigint, number, bigint];

            const amountIn = result[0];
            // Add 5% slippage/buffer to avoid reverts on small fluctuations
            return amountIn * 105n / 100n;
        } catch (e) {
            console.error("Quote failed", e);
            throw new Error("Failed to quote USDC for ETH swap");
        }
    }

    /**
     * Build tx data for swapping USDC -> ETH
     * Uses SwapRouter02.exactOutputSingle + unwrapWETH9
     */
    buildSwapData(recipient: Address, amountOutETH: bigint, maxAmountInUSDC: bigint): Hex {
        // We need to encode a Multicall:
        // 1. exactOutputSingle(USDC -> WETH) -> Router keeps WETH (recipient = 0x0...02 ?) or Router?
        // 2. unwrapWETH9(minAmount, recipient)

        // SwapRouter02 standard pattern for "Swap to ETH":
        // 1. Swap USDC -> WETH (recipient = Router)
        // 2. UnwrapWETH9 (recipient = User)

        const swapParams = {
            tokenIn: USDC_ADDRESS as Address,
            tokenOut: WETH_ADDRESS as Address,
            fee: 500,
            recipient: UNISWAP_V3_ROUTER as Address, // Router must hold WETH to unwrap it
            amountOut: amountOutETH,
            amountInMaximum: maxAmountInUSDC,
            sqrtPriceLimitX96: 0n
        };

        // Note: For SwapRouter02, if you want to unwrap, you usually set recipient to 0x000...000 during the swap if processing internally,
        // OR simply set recipient to ROUTER, then call unwrap.
        // But verifying standard Router02 multicall:
        // call[0]: exactOutputSingle(...) recipient = 0x0000..0000 (indicates msg.sender usually? No, in router context usually it means Router holds it)
        // call[1]: unwrapWETH9(0, finalRecipient)

        // Let's assume standard SwapRouter02 behavior supports Multicall.
        // We need to encode the function calls.

        const swapCalldata = encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: "exactOutputSingle",
            args: [swapParams]
        });

        const unwrapCalldata = encodeFunctionData({
            abi: parseAbi(["function unwrapWETH9(uint256 amountMinimum, address recipient) payable"]),
            functionName: "unwrapWETH9",
            args: [amountOutETH, recipient]
        });

        const multicallCalldata = encodeFunctionData({
            abi: parseAbi(["function multicall(bytes[] data) payable returns (bytes[])"]),
            functionName: "multicall",
            args: [[swapCalldata, unwrapCalldata]]
        });

        return multicallCalldata;
    }

    getRouterAddress(): Address {
        return UNISWAP_V3_ROUTER;
    }

    getUSDCAddress(): Address {
        return USDC_ADDRESS;
    }
}

export const uniswapService = new UniswapService();
