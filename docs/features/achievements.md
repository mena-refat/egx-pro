# Achievements

- [Overview](#overview)
- [Tiers (Levels)](#tiers-levels)
- [Achievement List](#achievement-list)
- [Notification Queue](#notification-queue)
- [achievementStore (Zustand)](#achievementstore-zustand)
- [CongratsCard Countdown](#congratscard-countdown)

## Overview

Achievements are defined in `server/lib/achievements.ts` as `ACHIEVEMENT_DEFS`. There are **40 achievements** in **4 tiers** (10 per tier). Progress is computed in `server/lib/achievementCheck.ts`; the frontend shows them in settings (e.g. Achievements tab) and can show a congrats card when new ones are unlocked.

## Tiers (Levels)

| Level (code) | Label (Arabic) |
|-------------|-----------------|
| beginner | الناشئ |
| growth | المستثمر |
| pro | المحترف |
| legend | الأسطورة |

User title (`userTitle`) in the DB is one of: `ناشئ`, `مستثمر`, `محترف`, `أسطورة` — derived from completed achievements per level.

## Achievement List

Each definition has: `id`, `level`, `title`, `shortDescription`, `longDescription`, `route` (frontend route or null).

| Tier | Count | Examples (id) |
|------|--------|----------------|
| beginner | 10 | first-step, know-yourself, profile-complete, first-look, watcher, investor, dreamer, first-referrer, subscriber, week-with-us |
| growth | 10 | active-analyst, wealth-builder, long-list, planner, loyal, network, diversified, decision-maker, first-goal-achieved, devoted |
| pro | 10 | expert-analyst, diverse-portfolio, strategist, egx-ambassador, big-portfolio, patient, daily-follower, researcher, annual-subscriber, leader |
| legend | 10 | legend-analyst, kings-portfolio, full-year, mega-referrer, referral-legend, community-leader, the-1000, overachiever, sector-expert, legend |

Full list is in `server/lib/achievements.ts` (40 entries).

## Notification Queue

When an achievement is unlocked, the backend can create a notification (`type: 'achievement'`, with `route` to the achievements or related page). Unseen achievement IDs are stored on the user (`unseenAchievements` array). The frontend fetches `/api/user/unseen-achievements` and `/api/user/achievements`; after showing the congrats UI, it can call `/api/user/mark-achievements-seen` to clear the list.

## achievementStore (Zustand)

The frontend uses a Zustand store (e.g. `achievementStore`) to hold list of achievements and unseen state so the congrats modal or dropdown can show new unlocks without refetching on every navigation. Exact store name and shape are in `src/` (e.g. achievement-related hooks or stores).

## CongratsCard 4-Second Countdown

The congrats card (e.g. `CongratsCard` or achievement modal) is shown when there are unseen achievements. It typically auto-closes after **4 seconds** (aligned with `TIMEOUTS.cardAutoClose` in `src/lib/constants.ts`). After the countdown, the user can dismiss and the app may call `mark-achievements-seen` to clear `unseenAchievements`.
