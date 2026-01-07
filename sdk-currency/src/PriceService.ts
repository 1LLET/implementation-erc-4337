import axios from "axios";

export class PriceService {
    private readonly baseUrl = "https://api.coingecko.com/api/v3/simple/price";

    /**
     * Get current prices for multiple tokens in multiple currencies.
     * @param ids Array of CoinGecko IDs (e.g. ['bitcoin', 'ethereum'])
     * @param vs_currencies Array of target currencies (e.g. ['usd', 'eur'])
     * @returns Object mapping ids to currency prices
     */
    async getPrices(ids: string[], vs_currencies: string[]): Promise<Record<string, Record<string, number>>> {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    ids: ids.join(","),
                    vs_currencies: vs_currencies.join(",")
                }
            });
            return response.data;
        } catch (error: any) {
            // Handle Axios errors safely
            const msg = error.response?.data?.error || error.message;
            throw new Error(`PriceService Error: ${msg}`);
        }
    }

    /**
     * Get price for a single token and optionally calculate value for an amount.
     * @param id CoinGecko ID (e.g. 'tether')
     * @param currency Target currency (e.g. 'ars', 'usd')
     * @param amount Optional amount to convert (e.g. '10')
     */
    async getPrice(id: string, currency: string, amount?: string | number) {
        const prices = await this.getPrices([id], [currency]);
        const price = prices[id]?.[currency];

        if (price === undefined) {
            throw new Error(`Price not found for ${id} in ${currency}`);
        }

        if (amount !== undefined) {
            const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
            if (isNaN(numericAmount)) throw new Error("Invalid amount");

            return {
                price,
                value: numericAmount * price,
                currency
            };
        }

        return { price, currency };
    }
}
