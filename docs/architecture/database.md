# Database (Prisma)

## Overview

The app uses PostgreSQL with Prisma. The source of truth is [schema.prisma](/C:/Users/menar/Desktop/egx-pro/prisma/schema.prisma), and every structural change should ship with a Prisma migration.

The database is designed around four rules:

- data should be valid even if application code fails
- common read paths should be indexed explicitly
- duplicate business records should be blocked at the database layer
- cleanup and background jobs should have direct index support

## Core Models

| Model | Purpose |
|-------|---------|
| `User` | account, auth, plan, privacy, referral, onboarding, notification settings |
| `RefreshToken` | session persistence and device tracking |
| `AuditLog` | security and audit history |
| `Stock` | EGX stock directory and sector classification |
| `Portfolio` | user holdings and average buy price |
| `Goal` | savings and investment goals |
| `Watchlist` | tracked tickers and optional target prices |
| `Analysis` | stored AI analysis history |
| `Referral` | referral ownership and lifecycle |
| `Prediction` | public/private market predictions and their resolution |
| `UserPredictionStats` | leaderboard and streak metrics |
| `DiscountCode` | promo code definitions |
| `DiscountUsage` | per-user promo code usage |
| `Notification` | in-app notifications |
| `ArchivedUser` | archived snapshot of deleted users |
| `Follow` | follower/following graph |

## Professional Hardening

The latest hardening pass adds protections in two areas:

### 1. Query Performance

New indexes were added for common operational queries:

- `User`: deletion jobs, plan expiry checks, chronological admin views
- `RefreshToken`: active-session lookups and expired token cleanup
- `Portfolio`: per-ticker aggregation
- `Goal`: deadline-based reminders
- `Analysis`: recent analysis by ticker
- `Referral`: referral progress reporting
- `Prediction`: active/expired prediction resolution and user history
- `DiscountCode`: active-code validity checks
- `Notification`: chronological feed and cleanup

### 2. Data Integrity

The database now blocks invalid states directly:

- duplicate watchlist rows for the same `userId + ticker`
- multiple referral records for the same referred user
- negative counters on user and prediction stats tables
- zero or negative share/price amounts where only positive values make sense
- invalid percentage ranges such as accuracy values outside `0..100`
- negative discount values and invalid promo usage limits

## Important Constraints

Business-level uniqueness now enforced by the database:

- `Watchlist(userId, ticker)` must be unique
- `Referral(referredUserId)` must be unique
- existing unique keys remain on fields like `User.email`, `User.phone`, `User.username`, `Stock.ticker`, and `DiscountCode.code`

## Migration Discipline

When updating the schema:

1. edit [schema.prisma](/C:/Users/menar/Desktop/egx-pro/prisma/schema.prisma)
2. create a matching migration under [prisma/migrations](/C:/Users/menar/Desktop/egx-pro/prisma/migrations)
3. prefer adding database constraints for core business rules instead of relying only on validation in routes or services
4. add indexes only for proven read paths, background jobs, or uniqueness guarantees

## Current Hardening Migration

The hardening changes are captured in [20260315090000_harden_database_constraints/migration.sql](/C:/Users/menar/Desktop/egx-pro/prisma/migrations/20260315090000_harden_database_constraints/migration.sql).
