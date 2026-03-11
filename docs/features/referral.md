# Referral System

- [Overview](#overview)
- [Code Format](#code-format)
- [Activation](#activation)
- [Reward Logic](#reward-logic)
- [checkAndRewardReferrer Flow](#checkandrewardreferrer-flow)
- [Notification on Reward](#notification-on-reward)

## Overview

Users get a unique referral code. When another user registers or activates with that code, the referrer can earn free Pro months. Codes are permanent and reward-based (every 5 active referrals = 1 free Pro month).

## Code Format

| Item | Value |
|------|--------|
| Pattern | `EGX-XXXXXXXX` |
| Characters | 8 chars from set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, 0, I, 1) |
| Uniqueness | Enforced in DB (`User.referralCode` unique) |

Generated in `server/lib/referral.ts` via `generateUniqueReferralCode()`, or on first login if missing (e.g. `EGX-` + 8 chars from UUID in auth/user services).

## Activation

- **On register:** Optional body field `referralCode`. If valid and not self-use, `referredBy` and `referralUsed` are set; `Referral` record is created with `isActive: false`.
- **On first login (activation):** When the referred user completes first login, the referral is marked active (`isActive: true`). Then `checkAndRewardReferrer(referrerId)` is called so the referrer can get rewards if they reached a new multiple of 5 active referrals.

Activation is tied to “first login” in the auth flow (e.g. after email/phone verification or first session).

## Reward Logic

| Rule | Value |
|------|--------|
| Unit | 1 free Pro month per **5 active** referrals |
| Scope | Unrewarded active referrals only (`rewardedAt` null) |
| Extension | `referralProExpiresAt` extended by 30 days per reward; if already in future, base date is current expiry |

So: 5 active → 1 month; 10 active → 2 months, etc. Already-rewarded referrals do not count again.

## checkAndRewardReferrer Flow

1. Count unrewarded active referrals for `referrerId` (`isActive: true`, `rewardedAt: null`).
2. `rewardsEarned = floor(count / 5)`.
3. If `rewardsEarned === 0`, return.
4. Load oldest `rewardsEarned * 5` unrewarded active referrals.
5. Get referrer’s current `referralProExpiresAt`; base date = max(now, current expiry).
6. New expiry = base date + `rewardsEarned * 30` days.
7. Update `User.referralProExpiresAt` for referrer and set `rewardedAt` on the selected `Referral` rows.
8. Create notification for referrer (see below).

Implemented in `server/lib/referral.ts` — `checkAndRewardReferrer(referrerId)`.

## Notification on Reward

When a reward is granted, `createNotification` is called with:

- **type:** `referral`
- **title:** e.g. "🎉 مكافأة إحالة!"
- **body:** e.g. "وصلت لـ X دعوات ناجحة — حصلت على Y شهر Pro مجاناً!"
- **route:** `/profile?tab=referrals`

User sees the achievement in the notifications and can open the referrals tab.
