# Documentation Verification Checklist

Use this checklist to confirm docs are complete and consistent with the codebase.

- [ ] `docs/` folder created with all files
- [ ] Root `README.md` updated with links to docs
- [ ] Every route in `server/routes/` documented in `docs/api/` (auth and market fully documented; others summarized in api/README.md)
- [ ] Every Prisma model documented in `docs/architecture/database.md`
- [ ] Every environment variable from `.env.example` (and env validation) documented in `docs/guides/environment-variables.md`
- [ ] No broken internal links between docs
- [ ] All code examples use real field names from the codebase
- [ ] curl examples in auth.md and market.md work against local server (base URL `http://localhost:3000`)

## File list

| File | Purpose |
|------|---------|
| docs/api/README.md | API overview and route summary |
| docs/api/auth.md | Auth API with curl examples |
| docs/api/market.md | Market data API with curl examples |
| docs/architecture/database.md | Prisma models and enums |
| docs/features/achievements.md | 40 achievements, 4 tiers, notification flow |
| docs/features/market-data.md | Twelve Data, polling, fallback, WebSocket, new source |
| docs/features/referral.md | Code format, activation, reward, checkAndRewardReferrer |
| docs/features/subscription.md | Free vs Pro, pricing, discount, referral Pro, planExpiresAt |
| docs/guides/getting-started.md | Prerequisites, install, env, DB, run |
| docs/guides/environment-variables.md | Full env var table |
| docs/decisions/market-data-strategy.md | EGX/Yahoo/Twelve Data rationale, credits, migration |
