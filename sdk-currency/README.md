# Currency SDK 💰

A standalone SDK for fetching crypto/fiat prices and performing conversions using CoinGecko.

## 📦 Installation

```bash
npm install @1llet.xyz/sdk-currency
```

## 🚀 Usage

### Initialize

```typescript
import { PriceService } from "@1llet.xyz/sdk-currency";

const service = new PriceService();
```

### 1. Get Bulk Prices

Fetch multiple prices at once.

```typescript
const prices = await service.getPrices(
    ["bitcoin", "ethereum", "tether", "usd-coin"], 
    ["usd", "eur", "ars"]
);

console.log(prices.bitcoin.usd); // 95000
console.log(prices.ethereum.ars); // ...
```

### 2. Get Price & Convert

Fetch a single price and calculate the value of an amount.

```typescript
// Example: Get value of 10 USDT in Argentine Peso (ARS)
const result = await service.getPrice("tether", "ars", "10");

console.log(`Rate: 1 USDT = ${result.price} ARS`);
console.log(`Total Value: ${result.value} ARS`);

// 3. Auto-Detect Currency
// Detects user's currency from IP (e.g. if in UK -> GBP)
const autoResult = await service.getPrice("bitcoin", "auto");
console.log(`BTC Price in local currency: ${autoResult.price} ${autoResult.currency.toUpperCase()}`);

// 4. Default Currency (USD)
const usdResult = await service.getPrice("ethereum"); // Defaults to 'usd'
console.log(`ETH Price in USD: ${usdResult.price}`);
```
