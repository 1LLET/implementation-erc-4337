export const DEFAULT_ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const DEFAULT_FACTORY = "0x9406Cc6185a346906296840746125a0E44976454"; // SimpleAccountFactory v0.6

export const factoryAbi = [
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "salt", type: "uint256" },
        ],
        name: "getAccountAddress",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "salt", type: "uint256" },
        ],
        name: "isAccountDeployed",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "salt", type: "uint256" },
        ],
        name: "createAccount",
        outputs: [{ name: "account", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export const entryPointAbi = [
    {
        inputs: [
            { name: "sender", type: "address" },
            { name: "key", type: "uint192" },
        ],
        name: "getNonce",
        outputs: [{ name: "nonce", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const smartAccountAbi = [
    {
        inputs: [
            { name: "target", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
        ],
        name: "execute",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "targets", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "datas", type: "bytes[]" },
        ],
        name: "executeBatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export const erc20Abi = [
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
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
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
] as const;
