# Environment Variables

- [Overview](#overview)
- [Variables Table](#variables-table)
- [Required vs Optional](#required-vs-optional)

## Overview

Environment variables are loaded from `.env` and `.env.local` (`.env.local` overrides). The server loads them first via `server/lib/dotenv.ts` so that services (e.g. Twelve Data) see keys at startup.

## Variables Table

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | ✅ | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/egxpro` |
| JWT_ACCESS_TOKEN_SECRET | ✅* | HMAC secret for JWT access tokens | `a-long-random-secret` |
| JWT_PRIVATE_KEY | ✅* | RS256 private key (PEM) for access token | `-----BEGIN PRIVATE KEY-----...` |
| JWT_PUBLIC_KEY | ✅* | RS256 public key (PEM); required if using JWT_PRIVATE_KEY | `-----BEGIN PUBLIC KEY-----...` |
| FRONTEND_URL or APP_URL | ✅ | Base URL of the app (for CORS, redirects) | `http://localhost:3000` |
| AUTH_PEPPER | ⚠️ | Password pepper (required in production, non-default) | `generate-a-long-random-string` |
| TWELVE_DATA_API_KEY | ✅ | Twelve Data API key (primary market data) | `abc123...` |
| RESEND_API_KEY | ⚠️ | Resend email API key (required in production) | `re_...` |
| FROM_EMAIL | ⚠️ | Sender email for Resend (required in production) | `noreply@example.com` |
| UPSTASH_REDIS_URL | ⚠️ | Upstash Redis REST URL (optional; cache) | `https://...upstash.io` |
| UPSTASH_REDIS_TOKEN | ⚠️ | Upstash Redis REST token | — |
| EGXLYTICS_API_URL | ❌ | Future EGXlytics API base URL | — |
| EGXLYTICS_API_KEY | ❌ | Future EGXlytics API key | — |
| GOOGLE_CLIENT_ID | ❌ | Google OAuth client ID | — |
| GOOGLE_CLIENT_SECRET | ❌ | Google OAuth client secret | — |
| REFRESH_TOKEN_SECRET | ❌ | Secret for refresh tokens (if not default) | — |
| CLAUDE_API_KEY / ANTHROPIC_API_KEY | ❌ | AI analysis (if used) | — |
| NEWS_API_KEY | ❌ | News API | — |
| EXCHANGERATE_API_KEY | ❌ | Exchange rate API | — |

\* Either `JWT_ACCESS_TOKEN_SECRET` (symmetric) or both `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (RS256) must be set.

## Required vs Optional

- **✅ Required:** Must be set or the server will not start (validated in `server/lib/env.ts`).
- **⚠️ Optional for dev, required for production:** e.g. `AUTH_PEPPER`, `RESEND_API_KEY`, `FROM_EMAIL`; Redis recommended for cache.
- **❌ Optional:** Feature works without them (e.g. EGXlytics, Google OAuth, news).
