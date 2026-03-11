# Market Data Strategy

- [Overview](#overview)
- [Why EGX Official Site Failed](#why-egx-official-site-failed)
- [Why Yahoo Finance Was Insufficient](#why-yahoo-finance-was-insufficient)
- [Why Twelve Data Was Chosen](#why-twelve-data-was-chosen)
- [Credit Optimization](#credit-optimization)
- [Current Limitation](#current-limitation)
- [Migration Path](#migration-path)

## Overview

EGX Pro needs reliable, near–real-time prices for EGX (Cairo) stocks. This document summarizes why the current single primary source (Twelve Data) was chosen and how the system evolved.

## Why EGX Official Site Failed

The EGX official website (egx.com.eg) was tried as a primary source (e.g. scraping or postback):

- **WAF / ThreatMetrix:** Requests were blocked or challenged, making scraping unreliable.
- **JavaScript/AJAX:** Data was loaded dynamically; simple HTML scraping did not see live prices.
- **Postback/VIEWSTATE:** An ASP.NET WebForms–style approach was attempted but remained fragile and blockable.

Conclusion: Relying on the official EGX site for automated, server-side price fetching was not viable.

## Why Yahoo Finance Was Insufficient

Yahoo Finance was used in an earlier MVP:

- **EOD / Stale:** For many EGX symbols, data was end-of-day or stale (e.g. volume 0, open = high = low = price).
- **Wrong prices:** Some tickers had incorrect or outdated prices.
- **No reliable real-time:** Consistency and freshness for EGX were not acceptable for a “live” product.

Conclusion: Yahoo was acceptable for an MVP but not as the long-term primary source for EGX.

## Why Twelve Data Was Chosen

| Criterion | Twelve Data |
|-----------|-------------|
| EGX support | ✅ XCAI exchange (EGX) supported |
| Reliability | ✅ Stable API, clear responses |
| Pricing model | Credit-based; free tier has limits (e.g. 8 req/min, 800/day) |
| Symbol format | `SYMBOL:XCAI` (e.g. `COMI:XCAI`) |
| Data freshness | Suitable for near–real-time use |

So Twelve Data became the single primary source after removing EGX scraping and Yahoo.

## Credit Optimization

- **Endpoint:** The app uses `/quote` (batch) rather than calling `/price` per symbol to reduce the number of requests.
- **Batching:** Up to 120 symbols per request; all EGX symbols are split into a few batches (e.g. 3 batches for ~284 symbols).
- **Credits per poll:** Each poll cycle = 3 API calls (3 batches) ⇒ 3 credits per poll on typical free-tier counting.
- **Throttling:** Minute and daily limits are enforced in `TwelveDataSource` to avoid 429s and stay within plan.

For higher symbol counts or frequency, a paid Twelve Data plan may be required.

## Current Limitation

- **Free tier:** Code limits: 7 requests per minute, 780 per day. With 3 batches per poll and 1-minute polling when the market is open, daily usage can approach or exceed the limit.
- **Pro plan ($229):** Twelve Data’s paid tier is needed for full EGX coverage at higher frequency or more symbols. The codebase is structured to keep the same integration and add rate limits or batching for a higher plan.

## Migration Path

| Phase | Source(s) | Notes |
|-------|-----------|--------|
| MVP | Yahoo Finance | EOD/stale; used for initial launch |
| Current | Twelve Data only | Single primary source; EGXlytics placeholder for future |
| Growth | Twelve Data Pro (+ optional EGXlytics) | Higher credits; EGXlytics as optional Source #1 when API is available |

The service is designed so that a new source (e.g. EGXlytics) can be added by implementing `IMarketDataSource` and registering it with a higher priority (lower number) than Twelve Data.
