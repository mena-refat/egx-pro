# API Reference

- [Overview](#overview)
- [Route Summary](#route-summary)
- [Authentication](#authentication)
- [Documented Endpoints](#documented-endpoints)

## Overview

All API routes are under `/api`. The server mounts routers by prefix (e.g. `/api/auth`, `/api/market`). Use `Authorization: Bearer <accessToken>` for protected routes; some auth routes also use the `refreshToken` cookie.

## Route Summary

| Prefix | Routes file | Description |
|--------|-------------|-------------|
| /api/auth | auth.ts | Register, login, refresh, 2FA, sessions, Google OAuth |
| /api/market | market-data.ts | Quotes, health, debug |
| /api/user | user.ts | Profile, achievements, referral, security, sessions, avatar, delete account |
| /api/profile | profile.ts | Profile completion |
| /api/portfolio | portfolio.ts | CRUD holdings, performance |
| /api/watchlist | watchlist.ts | List, add, update, remove, check targets |
| /api/goals | goals.ts | CRUD goals, update amount, complete |
| /api/billing | billing.ts | Plan, validate discount, upgrade |
| /api/stocks | stocks.ts | Market status, overview, prices, search, by-ticker (price, history, financials, news, order-depth, etc.) |
| /api/analysis | analysis.ts | POST /:ticker — create AI analysis |
| /api/notifications | notifications.ts | List, mark read, read all, clear |
| /api/referral | referral.ts | GET / — referral data |
| /api/news | news.ts | GET market, GET /:ticker |

## Authentication

- **Cookie:** After login/register, `refreshToken` is set in an HttpOnly cookie. Use `POST /api/auth/refresh` with that cookie to get a new `accessToken`.
- **Header:** Send `Authorization: Bearer <accessToken>` for protected endpoints. Missing or invalid token returns `401` with body `{ "error": "unauthorized" }` or `{ "error": "invalid_token" }`.

## Documented Endpoints

| Doc | Scope |
|-----|--------|
| [auth.md](./auth.md) | All auth endpoints, request/response, errors, curl examples |
| [market.md](./market.md) | Market quotes, health, debug, errors, curl examples |

Other route groups (user, portfolio, goals, billing, stocks, analysis, notifications, referral, news) follow the same patterns: JSON bodies, `{ data }` or `{ error }` responses. Refer to `server/routes/*.ts` and controllers for exact shapes.
