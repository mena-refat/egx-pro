# Borsa — بورصة

**Borsa** is an Egyptian stock market SaaS for retail investors: portfolio tracking, real-time EGX data, AI-powered analysis (Claude), goals, referrals, and predictions.  
**بورصة** — منصة تتبع أسهم وبورصة مصرية مع تحليل ذكي وأهداف مالية وإحالات.

## Tech stack

| Layer        | Stack |
|-------------|--------|
| Frontend    | React 19, Vite 6, Tailwind 4, SCSS Modules, Zustand, i18next (AR/EN RTL) |
| Backend     | Express 4, Prisma 6, PostgreSQL, Upstash Redis, JWT |
| Market data | yahoo-finance2 (EGX/.CA), Stooq fallback |
| AI          | Anthropic Claude API |
| Realtime    | WebSocket (prices) |

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

## Quick start (5 steps)

1. **Clone** — `git clone <repo> && cd egx-pro`
2. **Env** — `cp .env.example .env` and set `DATABASE_URL`, optional `CLAUDE_API_KEY`, `REDIS_*`, etc.
3. **Install** — `npm install`
4. **DB** — `npx prisma migrate dev` then `npx prisma generate`
5. **Run** — `npm run dev` → open [http://localhost:3000](http://localhost:3000)

See [docs/guides/environment-variables.md](docs/guides/environment-variables.md) for all variables.

## Folder structure

- `src/` — React app (pages, components, hooks, store, lib)
- `server/` — Express API (routes, controllers, services, middleware, schemas)
- `shared/` — Shared types (e.g. API response envelope)
- `prisma/` — Schema and migrations
- `public/` — Static assets and locale JSON (ar/en)

## API docs

- **Swagger UI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (when `EGX_EXPOSE_DOCS=true`)
- **Guides:** [docs/api/README.md](docs/api/README.md), [docs/api/auth.md](docs/api/auth.md), [docs/api/market.md](docs/api/market.md)

## Production & deployment

- **Database:** Use `DATABASE_URL` with `?connection_limit=20&pool_timeout=10`.
- **Logging:** Winston only (structured JSON); no filesystem logs.
- **Graceful shutdown:** SIGTERM/SIGINT close HTTP server, drain 5s, then Prisma disconnect.
