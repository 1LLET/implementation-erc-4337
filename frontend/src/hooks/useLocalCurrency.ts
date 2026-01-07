import { useState, useEffect, useRef } from "react";
import { PriceService } from "@1llet.xyz/sdk-currency";

// Create a single instance
const priceService = new PriceService();

export function useLocalCurrency(tokens: any[]) {
    const [currency, setCurrency] = useState<string>("usd"); // Default USD
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState<boolean>(false);

    // 1. Detect Currency on Mount
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const detected = await priceService.detectCurrency();
                console.log("[Currency] Detected:", detected);
                if (mounted) setCurrency(detected);
            } catch (e) {
                console.warn("Failed to detect currency", e);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    // 2. Fetch Prices when currency or tokens change
    const lastIdsRef = useRef<string>("");

    // 2. Fetch Prices when currency or tokens change
    useEffect(() => {
        let mounted = true;

        const fetchPrices = async () => {
            if (!tokens || tokens.length === 0) return;

            // Extract IDs
            const ids = tokens.map((t: any) => t.coingeckoId).filter((id: any) => typeof id === 'string').sort(); // Sort to ensure stability
            const idsKey = JSON.stringify(ids);

            // Only fetch if IDs have changed or if we don't have prices yet (and not loading)
            if (idsKey === lastIdsRef.current && Object.keys(prices).length > 0) return;

            if (ids.length === 0) return;

            lastIdsRef.current = idsKey;
            setLoading(true);
            try {
                // Fetch for detected currency
                const results = await priceService.getPrices(ids, [currency]);

                if (mounted) {
                    const newPrices: Record<string, number> = {};
                    ids.forEach((id: string) => {
                        if (results[id] && results[id][currency]) {
                            newPrices[id] = results[id][currency];
                        }
                    });
                    setPrices(prev => ({ ...prev, ...newPrices }));
                }
            } catch (e) {
                console.error("Error fetching prices:", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPrices();

        // Refresh every minute
        const interval = setInterval(() => {
            // Force fetch on interval by invalidating ref check? 
            // Better: just call fetchPrices but bypass ref check if needed, or simplier:
            // Just clear ref to force update
            lastIdsRef.current = "";
            fetchPrices();
        }, 60000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };

    }, [currency, tokens, prices]); // Added prices to dep to allow init check, but main logic guards against loop

    /**
     * Convert a balance string/number to local currency string
     * @param balance Amount of token (e.g. "0.5")
     * @param coingeckoId The token's coingecko ID
     */
    const getValue = (balance: string | number, coingeckoId?: string) => {
        if (!coingeckoId || !prices[coingeckoId]) return null;

        const price = prices[coingeckoId];
        const balNum = typeof balance === 'string' ? parseFloat(balance) : balance;

        if (isNaN(balNum)) return null;

        const value = balNum * price;
        return {
            value,
            formatted: `≈ ${value.toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase() })}`,
            currency
        };
    };

    return {
        currency,
        prices,
        loading,
        getValue
    };
}
