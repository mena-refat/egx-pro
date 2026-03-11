# Subscription (Free vs Pro)

- [Overview](#overview)
- [Free vs Pro Comparison](#free-vs-pro-comparison)
- [Pricing](#pricing)
- [Google Pay Integration](#google-pay-integration)
- [Discount Codes](#discount-codes)
- [Pro via Referrals](#pro-via-referrals)
- [planExpiresAt Logic](#planexpiresat-logic)

## Overview

Users have a `plan`: `free`, `pro`, or `yearly`. Pro and yearly are paid; Pro can also be granted via referral rewards. Billing routes: `/api/billing/plan`, `/api/billing/validate-discount`, `/api/billing/upgrade`.

## Free vs Pro Comparison

| Feature | Free | Pro |
|---------|------|-----|
| AI analysis per month | 3 | Unlimited (or higher limit) |
| Portfolio stocks | 10 | Higher/unlimited |
| Watchlist stocks | 20 | Higher/unlimited |
| Goals | 3 | Higher/unlimited |
| Price alerts | ❌ | ✅ |

Limits are defined in `server/lib/plan.ts` (`FREE_LIMITS`) and mirrored in `src/lib/constants.ts`.

## Pricing

| Plan | Price (EGP) |
|------|--------------|
| Pro (monthly) | 149 |
| Yearly | 1399 |

Defined in `src/lib/constants.ts` as `PLAN_PRICES` (`pro: 149`, `yearly: 1399`).

## Google Pay Integration

Upgrade flow uses `POST /api/billing/upgrade` with body: `plan`, optional `discountCode`, optional `paymentToken`. Google Pay (or other payment) is integrated via `paymentToken`; exact flow depends on frontend and payment provider configuration.

## Discount Codes

- **Full (100%):** Discount code can cover full price; user gets Pro/yearly without paying.
- **Partial:** Discount reduces price; remainder can be paid via `paymentToken`.

Validation: `POST /api/billing/validate-discount` with `code` and `plan` (`pro` or `annual`). Usage is recorded in `DiscountUsage`; `DiscountCode` has `maxUses`, `usedCount`, `expiresAt`.

## Pro via Referrals

When a user earns referral rewards (every 5 active referrals = 1 free Pro month), the server sets `referralProExpiresAt` on the User. `isPro()` in `server/lib/plan.ts` returns true if either:

- `plan` is `pro` or `yearly` and `planExpiresAt` is null or in the future, or  
- `referralProExpiresAt` is in the future.

So Pro can be granted by paid upgrade or by referral reward.

## planExpiresAt Logic

- **Free:** `planExpiresAt` typically null or not used.
- **Pro / Yearly:** Set when user upgrades; when `planExpiresAt` is in the past, access falls back to free limits unless `referralProExpiresAt` is still valid.
- **Referral Pro:** Only `referralProExpiresAt` is extended (e.g. +30 days per 5 referrals); `planExpiresAt` is unchanged.
