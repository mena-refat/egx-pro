# Market Data API

- [Overview](#overview)
- [Endpoints](#endpoints)
- [Request / Response](#request--response)
- [Error Responses](#error-responses)
- [Examples](#examples)

## Overview

Market data is served under `/api/market`. Quotes come from **Twelve Data** (XCAI/EGX) with fallback to **EGXlytics** (when configured) and **CACHE**. All symbols use EGX tickers (e.g. `COMI`, `CCAP`).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/market/quotes` | ✅ | Get quotes for up to 50 symbols |
| GET | `/api/market/health` | ❌ | Source health and market open status |
| GET | `/api/market/debug/:symbol` | ❌ | Debug per-source result (non-production only) |

## Request / Response

### GET /api/market/quotes

**Query:** `symbols` — comma-separated list of EGX tickers (max 50).

**Success (200):**

```json
{
  "data": {
    "COMI": {
      "symbol": "COMI",
      "price": 58.32,
      "change": 0.5,
      "changePercent": 0.86,
      "open": 57.82,
      "high": 58.5,
      "low": 57.5,
      "volume": 120000,
      "previousClose": 57.82,
      "timestamp": "2025-03-05T12:00:00.000Z",
      "source": "TWELVEDATA"
    }
  },
  "marketOpen": true
}
```

`source` is one of: `TWELVEDATA`, `EGXLYTICS`, `CACHE`.

---

### GET /api/market/health

**Success (200):**

```json
{
  "data": {
    "TWELVEDATA": {
      "status": "healthy",
      "failures": 0,
      "lastSuccess": "2025-03-05T12:00:00.000Z",
      "avgLatencyMs": 450
    },
    "EGXLYTICS": { "status": "degraded", "failures": 3, "lastSuccess": "...", "avgLatencyMs": 0 }
  },
  "marketOpen": true
}
```

## Error Responses

| Status | Error (body) | Description |
|--------|--------------|-------------|
| 400 | `VALIDATION_ERROR` | Missing `symbols` or more than 50 symbols |
| 401 | — | Not authenticated |
| 500 | `INTERNAL_ERROR` | Server error |

## Examples

### Get quotes (authenticated)

```bash
curl -X GET "http://localhost:3000/api/market/quotes?symbols=COMI,CCAP,SWDY" \
  -H "Authorization: Bearer eyJ..."
```

### Get health

```bash
curl -X GET http://localhost:3000/api/market/health
```

### Debug one symbol (development only)

```bash
curl -X GET http://localhost:3000/api/market/debug/COMI
```
