# EGX Pro

Egyptian Exchange (EGX) stock tracking and portfolio app with AI analysis, goals, referrals, and real-time market data.

## Documentation

| Section | Description |
|---------|-------------|
| [docs/guides/getting-started.md](docs/guides/getting-started.md) | Prerequisites, install, env, DB, run |
| [docs/guides/environment-variables.md](docs/guides/environment-variables.md) | All environment variables |
| [docs/api/README.md](docs/api/README.md) | API overview and route summary |
| [docs/api/auth.md](docs/api/auth.md) | Auth endpoints and examples |
| [docs/api/market.md](docs/api/market.md) | Market data endpoints |
| [docs/architecture/database.md](docs/architecture/database.md) | Prisma models and schema |
| [docs/features/](docs/features/) | Market data, subscription, referral, achievements |
| [docs/decisions/market-data-strategy.md](docs/decisions/market-data-strategy.md) | Why Twelve Data, migration path |

## Quick start

1. **Prerequisites:** Node.js 18+, PostgreSQL 15+
2. **Install:** `npm install`
3. **Env:** `cp .env.example .env.local` and set required variables (see [environment-variables](docs/guides/environment-variables.md))
4. **DB:** `npx prisma migrate dev` then `npx prisma db seed` (if seed exists)
5. **Run:** `npm run dev`
6. **Open:** [http://localhost:3000](http://localhost:3000)

## Tech stack

- **Backend:** Express, Prisma, PostgreSQL, Upstash Redis, JWT
- **Frontend:** React, Vite, Tailwind
- **Market data:** Twelve Data (EGX/XCAI) with optional EGXlytics fallback
