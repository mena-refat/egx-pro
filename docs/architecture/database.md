# Database (Prisma)

- [Overview](#overview)
- [Models](#models)
- [Enums](#enums)
- [Indexes](#indexes)

## Overview

The app uses **PostgreSQL** with **Prisma**. Schema is in `prisma/schema.prisma`. All models use `@@index` where needed for queries (e.g. by `userId`, `action`, `createdAt`).

## Models

| Model | Purpose |
|-------|---------|
| **User** | Accounts: auth, profile, plan, referral fields, notifications prefs, 2FA, lockout |
| **RefreshToken** | Sessions: token hash, userId, expiresAt, deviceInfo, revoke |
| **AuditLog** | Audit trail: userId, action, details, ipAddress, result, metadata |
| **Stock** | EGX stocks: ticker (unique), nameAr, nameEn, sector (GICS) |
| **Portfolio** | User holdings: userId, ticker, shares, avgPrice, buyDate |
| **Goal** | Financial goals: userId, title, targetAmount, currentAmount, currency, deadline, category, status |
| **Watchlist** | Watchlist items: userId, ticker, targetPrice, targetReachedNotifiedAt |
| **Analysis** | AI analysis history: userId, ticker, content |
| **Referral** | Referral links: referrerId, referredId (unique), isActive, rewardedAt |
| **DiscountCode** | Promo codes: code, type, value, active, expiresAt, maxUses, usedCount |
| **DiscountUsage** | Per-user usage of discount codes: userId, codeId (unique pair) |
| **Notification** | In-app notifications: userId, type, title, body, route, isRead |
| **ArchivedUser** | Soft-deleted users: originalId, archived userData |

## Enums

| Enum | Values |
|------|--------|
| **GicsSector** | INFORMATION_TECHNOLOGY, HEALTH_CARE, FINANCIALS, CONSUMER_DISCRETIONARY, CONSUMER_STAPLES, ENERGY, INDUSTRIALS, MATERIALS, UTILITIES, REAL_ESTATE, COMMUNICATION_SERVICES |

Used on `Stock.sector`.

## Indexes

Indexes are defined in the schema for:

- **User:** (none beyond primary/unique on email, phone, username, referralCode)
- **RefreshToken:** lookup by token, userId
- **AuditLog:** userId, (userId, createdAt), action
- **Portfolio:** userId, (userId, ticker)
- **Goal:** userId, (userId, status)
- **Watchlist:** userId, (userId, ticker)
- **Analysis:** userId, (userId, ticker)
- **Referral:** referrerId, (referrerId, isActive)
- **DiscountUsage:** userId, codeId
- **Notification:** userId, (userId, isRead), (userId, createdAt)
- **Stock:** sector

Relations use `onDelete: Cascade` or `SetNull` as appropriate (e.g. User → Portfolios cascade; AuditLog user SetNull).
