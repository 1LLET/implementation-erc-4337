export const usdcErc3009Abi = [
    {
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
        ],
        name: "transferWithAuthorization",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export const tokenMessengerAbi = [
    {
        inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" }, // Suspected wrapper arg
            { name: "minFinalityThreshold", type: "uint32" } // Suspected wrapper arg
        ],
        name: "depositForBurn",
        outputs: [{ name: "_nonce", type: "uint64" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Alternative overload often used:
    {
        inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
        ],
        name: "depositForBurn",
        outputs: [{ name: "_nonce", type: "uint64" }],
        stateMutability: "nonpayable",
        type: "function",
    }
] as const;

export const messageTransmitterAbi = [
    {
        inputs: [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
        ],
        name: "receiveMessage",
        outputs: [{ name: "success", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;
