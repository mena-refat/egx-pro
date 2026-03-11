# Market Data (Twelve Data)

- [Overview](#overview)
- [Twelve Data Integration](#twelve-data-integration)
- [Credit and Batching](#credit-and-batching)
- [Polling Schedule](#polling-schedule)
- [Trading Hours](#trading-hours)
- [Fallback Chain](#fallback-chain)
- [WebSocket Broadcast](#websocket-broadcast)
- [Adding a New Data Source](#adding-a-new-data-source)

## Overview

EGX Pro uses **Twelve Data** as the primary live price source for EGX (XCAI). The server polls symbols in batches, caches results in Redis, and broadcasts updates over WebSockets. Fallback order: **TWELVEDATA → EGXLYTICS → CACHE**.

## Twelve Data Integration

| Item | Value |
|------|--------|
| API base | `https://api.twelvedata.com` |
| Endpoint used | `/quote` (batch) |
| Symbol format | `SYMBOL:XCAI` (e.g. `COMI:XCAI`) |
| Auth | `apikey` query parameter |

The service (`server/services/market-data/sources/twelve-data-source.ts`) throttles by **7 requests/minute** and **780 requests/day** (configurable in code). Batches of up to 120 symbols per request.

## Credit and Batching

- **Credits per poll:** Each batch request consumes API credits (Twelve Data free tier: 8 req/min, 800/day).
- **Symbol count:** All EGX tickers (from `EGX_TICKERS`) are polled; typically split into 3 batches (e.g. ~284 symbols → 3 batches of 120).
- **Credit calculation:** 3 batches per poll ⇒ 3 API calls per poll cycle. Adjust batch size and poll interval to stay within plan limits.

## Polling Schedule

| Condition | Interval |
|-----------|----------|
| Market open | Every **1 minute** |
| Market closed | Every **5 minutes** (off-hours) |

Polling is started once in `server.ts` via `marketDataService.startPolling(symbols)`. Results are written to Redis and broadcast to WebSocket clients.

## Trading Hours

Trading hours are evaluated in **Cairo time** (server uses local time; ensure server TZ or explicit Cairo handling if needed):

| Item | Value |
|------|--------|
| Open | 10:00 |
| Close | 15:00 (3:00 PM) |
| Days | Sunday–Thursday |

Implementation: `server/services/market-data/market-data.service.ts` — `isMarketOpen()` uses `MARKET_OPEN_HOUR` (10) and `MARKET_CLOSE_HOUR` (15).

## Fallback Chain

1. **TWELVEDATA** (priority 0) — Primary. If available and within rate limits, used first.
2. **EGXLYTICS** (priority 1) — Optional. Used when configured; placeholder implementation until API key is set.
3. **CACHE** — Stale cache (e.g. 1 hour TTL) used when a symbol fails all live sources.

Symbols that fail repeatedly (e.g. 3 consecutive failures) are deprioritized for 1 hour to avoid wasting calls.

## WebSocket Broadcast Flow

1. After each successful poll, `MarketDataService` calls the registered `broadcastFn` (set from `server.ts`).
2. The WebSocket server sends the `Map<string, StockQuote>` (or equivalent payload) to all connected clients.
3. Frontend subscribes to the same WebSocket and updates prices in real time.

## Adding a New Data Source

1. **Implement the interface** in `server/services/market-data/types.ts`:
   - `IMarketDataSource`: `name`, `priority`, `isAvailable()`, `fetchQuotes(symbols)`.

2. **Create a new source file** under `server/services/market-data/sources/` (e.g. `my-source.ts`).

3. **Return** `DataSourceResult`: `{ quotes: Map<string, StockQuote>, failed: string[], source: string, latency: number }`.

4. **Register** the source in `market-data.service.ts` constructor: add to `this.sources` array. Sources are sorted by `priority` (lower = higher priority).

5. **Add** the source name to the `StockQuote.source` union in `types.ts` if it is a new literal (e.g. `'MYSOURCE'`).

6. **Configure** any API keys in `.env` and document in `guides/environment-variables.md`.
