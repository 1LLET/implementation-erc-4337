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
     * Detect user's currency based on IP address.
     * Uses ipapi.co for geolocation.
     */
    async detectCurrency(): Promise<string> {
        try {
            const response = await axios.get("https://ipapi.co/json/");
            return response.data.currency?.toLowerCase() || "usd";
        } catch (error) {
            console.warn("Currency detection failed, defaulting to USD");
            return "usd";
        }
    }

    /**
     * Get price for a single token and optionally calculate value for an amount.
     * @param id CoinGecko ID (e.g. 'tether')
     * @param currency Target currency (e.g. 'ars', 'usd', 'auto'). Defaults to 'usd'.
     * @param amount Optional amount to convert (e.g. '10')
     */
    async getPrice(id: string, currency: string = "usd", amount?: string | number) {
        let targetCurrency = currency.toLowerCase();

        if (targetCurrency === "auto") {
            targetCurrency = await this.detectCurrency();
        }

        const prices = await this.getPrices([id], [targetCurrency]);
        const price = prices[id]?.[targetCurrency];

        if (price === undefined) {
            throw new Error(`Price not found for ${id} in ${targetCurrency}`);
        }

        if (amount !== undefined) {
            const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
            if (isNaN(numericAmount)) throw new Error("Invalid amount");

            return {
                price,
                value: numericAmount * price,
                currency: targetCurrency
            };
        }

        return { price, currency: targetCurrency };
    }
}
