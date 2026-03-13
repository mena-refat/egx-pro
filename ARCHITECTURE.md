# Borsa — Architecture

## Folder Structure

```
├── server.ts              # Express entry point + cron jobs
├── server/
│   ├── controllers/       # HTTP handlers (thin — delegate to services)
│   ├── services/         # Business logic (throw AppError on failure)
│   ├── repositories/    # Database access (Prisma queries only)
│   ├── schemas/          # Zod request validation schemas
│   ├── middleware/       # Auth, validation, rate limiting
│   ├── lib/              # Shared utilities (Redis, logger, constants)
│   ├── jobs/             # Background jobs (prediction resolution)
│   └── tests/            # Integration tests
├── src/
│   ├── pages/            # Route-level components
│   ├── components/
│   │   ├── features/     # Domain components (auth, dashboard, stocks...)
│   │   ├── shared/       # Reusable (EmptyState, ErrorBoundary, Toast...)
│   │   ├── ui/           # Primitives (Button, Input, Modal, Skeleton...)
│   │   └── layout/       # Sidebar, Header, BottomNav
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand stores
│   ├── lib/              # Client utilities (API client, auth tokens, i18n)
│   └── types/            # TypeScript type definitions
├── shared/
│   └── types/            # Types shared between server and client (if any)
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets and locales
```

## Request Flow

```
Client → API Client (Axios + interceptors) → Express Router
→ validate() middleware (Zod) → authenticate() middleware (JWT)
→ Controller (thin) → Service (business logic) → Repository (Prisma)
→ sendSuccess() / throw AppError → Global Error Handler → JSON Response
```

## Data Flow for Live Prices

```
MarketDataService polls Yahoo Finance (+ Stooq fallback)
→ Caches in Redis + in-memory
→ Broadcasts via WebSocket (filtered by client subscriptions)
→ Frontend useLivePrices() updates local state
```

## API Response Format

- **Success (single):** `{ ok: true, data: T }`
- **Success (list):** `{ ok: true, items: T[], pagination?: { page, limit, total, totalPages } }`
- **Error:** `{ ok: false, error: string }` (error is a code, e.g. `VALIDATION_ERROR`, `NOT_FOUND`)

## Auth

- **Access token:** JWT in `Authorization: Bearer <token>` or request body where needed.
- **Refresh token:** HttpOnly cookie, path `/api/auth`, used by `POST /api/auth/refresh`.
- **Middleware:** `authenticate` attaches `req.user`; use `AuthRequest` type in controllers.
