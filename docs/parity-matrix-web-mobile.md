# Web/Mobile Parity Matrix

This matrix tracks feature parity between `packages/web`, `packages/mobile`, and `packages/server`.

Last updated: 2026-03-20

## Legend
- `FULL`: Implemented on web + mobile and enforced by backend/database.
- `PARTIAL`: Exists on both but UX/details differ.
- `WEB_ONLY` / `MOBILE_ONLY`: Capability gap.

## Core Product Areas
| Feature Area | Web | Mobile | Backend/DB | Status | Notes |
|---|---|---|---|---|---|
| Auth (login/register/refresh/me) | Yes | Yes | Yes | FULL | Shared API contracts; token refresh supported for both clients. |
| 2FA auth flow | Yes | Yes | Yes | FULL | Verification and setup paths present in both clients. |
| Biometric/PIN login | N/A | Yes | Partial | PARTIAL | Mobile-specific UX; PIN endpoint contract still requires backend hardening for full reliability. |
| Username setup/onboarding gate | Yes | Yes | Yes | FULL | Both clients gate access until onboarding/username complete. |
| Dashboard/home | Yes | Yes | Yes | FULL | Data-backed with shared backend endpoints. |
| Market screen/listing | Yes | Yes | Yes | FULL | Shared prices/market endpoints and live updates. |
| Stock details + price chart | Yes | Yes | Yes | FULL | Mobile chart now uses `/api/stocks/:ticker/history`. |
| Watchlist add/remove | Yes | Yes | Yes | FULL | Shared watchlist endpoints and plan limits. |
| Price alert target | Yes | Yes | Yes | FULL | Paid gating enforced server-side. |
| Portfolio CRUD + stats | Yes | Yes | Yes | FULL | Same domain logic and limits via backend service layer. |
| Goals CRUD/progress/complete | Yes | Yes | Yes | FULL | Shared goal limits and ownership checks. |
| Predictions (feed/my/leaderboard/create) | Yes | Yes | Yes | FULL | Shared limits/modes enforced in backend. |
| AI analyze/compare/recommendations | Yes | Yes | Yes | FULL | Shared quota enforcement and plan checks. |
| Discover/social follow/profile | Yes | Yes | Yes | FULL | Follow graph and profile privacy persisted centrally. |
| Notifications inbox/actions | Yes | Yes | Yes | FULL | Mark read/delete/clear now contract-consistent. |
| Support tickets | Yes | Yes | Yes | FULL | Shared ticket model and paid/referral gating. |
| Referral/rewards | Yes | Yes | Yes | FULL | Shared referral summary/apply/redeem backend paths. |
| Subscription plans + promo | Yes | Yes | Yes | FULL | Shared billing domain and plan state. |
| Account avatar upload | Yes | Yes | Yes | FULL | Mobile now supports `/api/user/avatar` like web. |
| Danger zone (delete account) | Yes | Yes | Yes | FULL | Shared backend account deletion process. |

## Contract & Infrastructure Parity
| Area | Status | Notes |
|---|---|---|
| Server response envelope consistency | FULL | High-use action/delete endpoints normalized to success envelope. |
| Error-code normalization | PARTIAL | High-impact auth/profile/security codes normalized; remaining legacy aliases can be removed in cleanup pass. |
| Single backend + database source | FULL | Both clients consume same server + Prisma schema. |
| Type safety baseline (server/web/mobile) | FULL | `typecheck` passes on all three workspaces after fixes. |

## Remaining Items to Reach Strict 100% Operational Parity
1. Remove legacy error-code aliases after monitoring window (web currently supports both old/new for safety).
2. Add an automated parity test suite for shared critical flows (auth, plan gating, goals/portfolio/watchlist/predictions).
3. Lock API schema generation + client contract checks in CI to prevent drift.

