import * as StellarSdk from "stellar-sdk";
import { STELLAR } from "../chains/NoEvm/Stellar";

export class StellarService {
    server: StellarSdk.Horizon.Server;
    network: string;

    constructor() {
        if (!STELLAR.nonEvm?.serverURL || !STELLAR.nonEvm?.networkPassphrase) {
            throw new Error("Stellar Non-EVM config missing or incomplete");
        }
        this.server = new StellarSdk.Horizon.Server(STELLAR.nonEvm.serverURL);
        this.network = STELLAR.nonEvm.networkPassphrase;
    }

    /**
     * Get balance for a specific token (or all if not specified)
     * Returns string representation
     */
    async getBalance(address: string, tokenName: string = "XLM"): Promise<string> {
        try {
            const account = await this.server.loadAccount(address);

            // Find asset definition
            const assetDef = STELLAR.assets.find(a => a.name === tokenName);
            if (!assetDef) throw new Error(`Asset ${tokenName} not configured`);

            const isNative = assetDef.address === "native";

            const balanceLine = account.balances.find((b: any) => {
                if (isNative) {
                    return b.asset_type === "native";
                }
                return b.asset_code === tokenName && b.asset_issuer === assetDef.address;
            });

            return balanceLine ? balanceLine.balance : "0";
        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                return "0"; // Account not active
            }
            throw e;
        }
    }

    /**
     * Build and Sign a Transfer Transaction
     */
    async buildTransferXdr(
        senderPk: string,
        recipient: string,
        amount: string,
        tokenName: string = "XLM",
        memo?: string
    ): Promise<string> {
        const keypair = StellarSdk.Keypair.fromSecret(senderPk);
        const sourceAddress = keypair.publicKey();

        // Check if account exists
        let account;
        try {
            account = await this.server.loadAccount(sourceAddress);
        } catch (e: any) {
            throw new Error(`Stellar Account ${sourceAddress} not valid or not active.`);
        }

        const asset = this.getAsset(tokenName);

        const txBuilder = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.network
        });

        txBuilder.addOperation(StellarSdk.Operation.payment({
            destination: recipient,
            asset: asset,
            amount: amount
        }));

        if (memo) {
            // Simple text memo support for now
            txBuilder.addMemo(StellarSdk.Memo.text(memo));
        }

        txBuilder.setTimeout(30);

        const builtTx = txBuilder.build();
        builtTx.sign(keypair);

        return builtTx.toXDR();
    }

    /**
     * Submit Signed XDR
     */
    async submitXdr(xdr: string) {
        // Construct transaction from XDR to submit
        const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, this.network);
        return this.server.submitTransaction(tx);
    }

    public getAsset(tokenName: string): StellarSdk.Asset {
        const assetDef = STELLAR.assets.find(a => a.name === tokenName);
        if (!assetDef) {
            // Default fallback if not found? Or throw.
            if (tokenName === "XLM") return StellarSdk.Asset.native();
            throw new Error(`Asset ${tokenName} not found in configuration`);
        }

        if (assetDef.address === "native") {
            return StellarSdk.Asset.native();
        }

        return new StellarSdk.Asset(assetDef.name, assetDef.address);
    }

    public getKeypair(pk: string) {
        return StellarSdk.Keypair.fromSecret(pk);
    }
}
