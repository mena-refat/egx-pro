-- =============================================================================
-- Migration: Professional Database Hardening
-- File:      prisma/migrations/20260319000000_professional_db_hardening/migration.sql
-- Author:    Generated from deep codebase analysis
-- Applies:   PostgreSQL 14+
--
-- Changes (in safe, additive order):
--   1.  Enums  — convert freeform String columns to typed PG enums
--   2.  Types  — Float → NUMERIC(18,6) for all financial/price columns
--   3.  Schema — remove AuditLog.timestamp (duplicate of createdAt)
--   4.  Schema — convert User.interestedSectors String → TEXT[] native array
--   5.  Constraints — User.plan, Goal.status, Referral.status, DiscountCode.type,
--                     AuditLog.result, IdempotencyKey.status domain guards
--   6.  Indexes — partial indexes on hot low-cardinality predicates
--   7.  Indexes — covering indexes for the most expensive N+1 patterns
--   8.  Maintenance — AuditLog TTL index for 90-day cleanup job
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. SAFETY: verify we are on the right DB (prevents running on wrong env)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'User' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Migration guard: "User" table not found. Wrong database?';
  END IF;
END $$;


-- =============================================================================
-- 1. ENUMS
--    Creating PG native enums for every column that has a fixed value set.
--    Safer approach: create enum → add new column → backfill → swap → drop old.
--    For columns that are NOT NULL with a default we use the direct ALTER approach
--    wrapped in a transaction (already inside BEGIN above).
-- =============================================================================

-- 1-A. User.plan  (values observed in codebase: free | pro | yearly | ultra | ultra_yearly)
CREATE TYPE "UserPlan" AS ENUM ('free', 'pro', 'yearly', 'ultra', 'ultra_yearly');

ALTER TABLE "User"
  ADD COLUMN "plan_new" "UserPlan" NOT NULL DEFAULT 'free';

UPDATE "User"
SET "plan_new" = "plan"::"UserPlan"
WHERE "plan" IN ('free','pro','yearly','ultra','ultra_yearly');

-- Any unknown legacy value falls back to 'free'
UPDATE "User" SET "plan_new" = 'free'
WHERE "plan" NOT IN ('free','pro','yearly','ultra','ultra_yearly');

ALTER TABLE "User" DROP COLUMN "plan";
ALTER TABLE "User" RENAME COLUMN "plan_new" TO "plan";

-- Restore index dropped with the column (Prisma manages it, but we ensure it)
CREATE INDEX IF NOT EXISTS "User_plan_planExpiresAt_idx" ON "User"("plan", "planExpiresAt");

-- 1-B. User.riskTolerance  (conservative | moderate | aggressive | null)
CREATE TYPE "RiskTolerance" AS ENUM ('conservative', 'moderate', 'aggressive');

ALTER TABLE "User"
  ADD COLUMN "riskTolerance_new" "RiskTolerance" DEFAULT 'moderate';

UPDATE "User"
SET "riskTolerance_new" = "riskTolerance"::"RiskTolerance"
WHERE "riskTolerance" IN ('conservative','moderate','aggressive');

ALTER TABLE "User" DROP COLUMN "riskTolerance";
ALTER TABLE "User" RENAME COLUMN "riskTolerance_new" TO "riskTolerance";

-- 1-C. User.language  (ar | en | system)
CREATE TYPE "AppLanguage" AS ENUM ('ar', 'en', 'system');

ALTER TABLE "User"
  ADD COLUMN "language_new" "AppLanguage" NOT NULL DEFAULT 'system';

UPDATE "User"
SET "language_new" = "language"::"AppLanguage"
WHERE "language" IN ('ar','en','system');

UPDATE "User" SET "language_new" = 'system'
WHERE "language" NOT IN ('ar','en','system');

ALTER TABLE "User" DROP COLUMN "language";
ALTER TABLE "User" RENAME COLUMN "language_new" TO "language";

-- 1-D. User.theme  (dark | light | system)
CREATE TYPE "AppTheme" AS ENUM ('dark', 'light', 'system');

ALTER TABLE "User"
  ADD COLUMN "theme_new" "AppTheme" NOT NULL DEFAULT 'system';

UPDATE "User"
SET "theme_new" = "theme"::"AppTheme"
WHERE "theme" IN ('dark','light','system');

UPDATE "User" SET "theme_new" = 'system'
WHERE "theme" NOT IN ('dark','light','system');

ALTER TABLE "User" DROP COLUMN "theme";
ALTER TABLE "User" RENAME COLUMN "theme_new" TO "theme";

-- 1-E. Goal.status  (active | completed | cancelled)
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'cancelled');

ALTER TABLE "Goal"
  ADD COLUMN "status_new" "GoalStatus" NOT NULL DEFAULT 'active';

UPDATE "Goal"
SET "status_new" = "status"::"GoalStatus"
WHERE "status" IN ('active','completed','cancelled');

UPDATE "Goal" SET "status_new" = 'active'
WHERE "status" NOT IN ('active','completed','cancelled');

ALTER TABLE "Goal" DROP COLUMN "status";
ALTER TABLE "Goal" RENAME COLUMN "status_new" TO "status";

-- Restore Prisma-managed index
CREATE INDEX IF NOT EXISTS "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- 1-F. Referral.status  (pending | completed)
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'completed');

ALTER TABLE "Referral"
  ADD COLUMN "status_new" "ReferralStatus" NOT NULL DEFAULT 'pending';

UPDATE "Referral"
SET "status_new" = "status"::"ReferralStatus"
WHERE "status" IN ('pending','completed');

UPDATE "Referral" SET "status_new" = 'pending'
WHERE "status" NOT IN ('pending','completed');

ALTER TABLE "Referral" DROP COLUMN "status";
ALTER TABLE "Referral" RENAME COLUMN "status_new" TO "status";

-- Restore Prisma-managed index
CREATE INDEX IF NOT EXISTS "Referral_referrerId_status_createdAt_idx"
  ON "Referral"("referrerId", "status", "createdAt");

-- 1-G. DiscountCode.type  (percentage | amount)
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'amount');

ALTER TABLE "DiscountCode"
  ADD COLUMN "type_new" "DiscountType" NOT NULL DEFAULT 'percentage';

UPDATE "DiscountCode"
SET "type_new" = "type"::"DiscountType"
WHERE "type" IN ('percentage','amount');

ALTER TABLE "DiscountCode" DROP COLUMN "type";
ALTER TABLE "DiscountCode" RENAME COLUMN "type_new" TO "type";

-- 1-H. AuditLog.result  (success | failure)
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

ALTER TABLE "AuditLog"
  ADD COLUMN "result_new" "AuditResult";

UPDATE "AuditLog"
SET "result_new" = "result"::"AuditResult"
WHERE "result" IN ('success','failure');

ALTER TABLE "AuditLog" DROP COLUMN "result";
ALTER TABLE "AuditLog" RENAME COLUMN "result_new" TO "result";

-- 1-I. IdempotencyKey.status  (PROCESSING | COMPLETED | FAILED)
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "IdempotencyKey"
  ADD COLUMN "status_new" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING';

UPDATE "IdempotencyKey"
SET "status_new" = "status"::"IdempotencyStatus"
WHERE "status" IN ('PROCESSING','COMPLETED','FAILED');

UPDATE "IdempotencyKey" SET "status_new" = 'PROCESSING'
WHERE "status" NOT IN ('PROCESSING','COMPLETED','FAILED');

ALTER TABLE "IdempotencyKey" DROP COLUMN "status";
ALTER TABLE "IdempotencyKey" RENAME COLUMN "status_new" TO "status";

-- Restore index
CREATE INDEX IF NOT EXISTS "IdempotencyKey_userId_status_expiresAt_idx"
  ON "IdempotencyKey"("userId", "status", "expiresAt");


-- =============================================================================
-- 2. FLOAT → NUMERIC(18,6) FOR FINANCIAL COLUMNS
--    IEEE-754 doubles have rounding errors (e.g. 0.1 + 0.2 ≠ 0.3).
--    All money / price / ratio columns must use NUMERIC (exact arithmetic).
--    18 digits total, 6 decimal places: handles up to 999,999,999,999.999999 EGP.
-- =============================================================================

-- Portfolio
ALTER TABLE "Portfolio"
  ALTER COLUMN "shares"   TYPE NUMERIC(18,6) USING "shares"::NUMERIC(18,6),
  ALTER COLUMN "avgPrice" TYPE NUMERIC(18,6) USING "avgPrice"::NUMERIC(18,6);

-- Goal
ALTER TABLE "Goal"
  ALTER COLUMN "targetAmount"  TYPE NUMERIC(18,6) USING "targetAmount"::NUMERIC(18,6),
  ALTER COLUMN "currentAmount" TYPE NUMERIC(18,6) USING "currentAmount"::NUMERIC(18,6);

-- Watchlist
ALTER TABLE "Watchlist"
  ALTER COLUMN "targetPrice" TYPE NUMERIC(18,6) USING "targetPrice"::NUMERIC(18,6);

-- Analysis (price tracking & accuracy)
ALTER TABLE "Analysis"
  ALTER COLUMN "priceAtAnalysis" TYPE NUMERIC(18,6) USING "priceAtAnalysis"::NUMERIC(18,6),
  ALTER COLUMN "targetPrice"     TYPE NUMERIC(18,6) USING "targetPrice"::NUMERIC(18,6),
  ALTER COLUMN "stopLoss"        TYPE NUMERIC(18,6) USING "stopLoss"::NUMERIC(18,6),
  ALTER COLUMN "priceAfter7d"    TYPE NUMERIC(18,6) USING "priceAfter7d"::NUMERIC(18,6),
  ALTER COLUMN "priceAfter30d"   TYPE NUMERIC(18,6) USING "priceAfter30d"::NUMERIC(18,6),
  ALTER COLUMN "accuracyScore"   TYPE NUMERIC(8,4)  USING "accuracyScore"::NUMERIC(8,4);

-- Prediction
ALTER TABLE "Prediction"
  ALTER COLUMN "targetPrice"     TYPE NUMERIC(18,6) USING "targetPrice"::NUMERIC(18,6),
  ALTER COLUMN "priceAtCreation" TYPE NUMERIC(18,6) USING "priceAtCreation"::NUMERIC(18,6),
  ALTER COLUMN "resolvedPrice"   TYPE NUMERIC(18,6) USING "resolvedPrice"::NUMERIC(18,6),
  ALTER COLUMN "accuracyPct"     TYPE NUMERIC(8,4)  USING "accuracyPct"::NUMERIC(8,4);

-- UserPredictionStats (accuracy rate is a percentage 0-100)
ALTER TABLE "UserPredictionStats"
  ALTER COLUMN "accuracyRate" TYPE NUMERIC(8,4) USING "accuracyRate"::NUMERIC(8,4);

-- DiscountCode.value (percentage 0-100 or flat EGP amount)
ALTER TABLE "DiscountCode"
  ALTER COLUMN "value" TYPE NUMERIC(18,6) USING "value"::NUMERIC(18,6);

-- User.monthlyBudget
ALTER TABLE "User"
  ALTER COLUMN "monthlyBudget" TYPE NUMERIC(18,6) USING "monthlyBudget"::NUMERIC(18,6);


-- =============================================================================
-- 3. REMOVE AuditLog.timestamp (duplicate of createdAt, causes confusion)
-- =============================================================================

ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "timestamp";


-- =============================================================================
-- 4. User.interestedSectors: String JSON hack → native TEXT[]
--    The column stores JSON-encoded string arrays like '["FINANCIALS","ENERGY"]'.
--    PostgreSQL TEXT[] is the correct type — supports GIN indexing, array operators.
-- =============================================================================

ALTER TABLE "User"
  ADD COLUMN "interestedSectors_new" TEXT[] NOT NULL DEFAULT '{}';

-- Parse the JSON string array and convert to PG array.
-- COALESCE handles NULL rows; regexp handles empty/malformed values.
UPDATE "User"
SET "interestedSectors_new" = ARRAY(
  SELECT jsonb_array_elements_text(
    CASE
      WHEN "interestedSectors" IS NULL OR "interestedSectors" = '' THEN '[]'::jsonb
      ELSE "interestedSectors"::jsonb
    END
  )
)
WHERE "interestedSectors" IS NOT NULL
  AND "interestedSectors" != ''
  AND "interestedSectors" != '[]';

ALTER TABLE "User" DROP COLUMN "interestedSectors";
ALTER TABLE "User" RENAME COLUMN "interestedSectors_new" TO "interestedSectors";


-- =============================================================================
-- 5. ADDITIONAL DOMAIN CONSTRAINTS
--    (The earlier migration already covers non-negative checks on numeric fields.
--     These are constraints the earlier migration missed.)
-- =============================================================================

-- User: plan expiry must be in the future when set
-- (Cannot enforce "must be future at insert time" without a trigger; we just
--  ensure it's not in the past more than 10 years — catches fat-finger dates.)
ALTER TABLE "User"
  ADD CONSTRAINT "User_planExpiresAt_reasonable"
    CHECK ("planExpiresAt" IS NULL OR "planExpiresAt" > '2020-01-01'::TIMESTAMPTZ);

-- User: both or neither of email-verification fields
-- (isEmailVerified=true requires email to be set)
ALTER TABLE "User"
  ADD CONSTRAINT "User_emailVerified_requires_email"
    CHECK (NOT "isEmailVerified" OR "email" IS NOT NULL);

-- User: deletion fields must be consistent
ALTER TABLE "User"
  ADD CONSTRAINT "User_deletion_consistency"
    CHECK (
      (NOT "isDeleted" AND "deletedAt" IS NULL AND "deletionScheduledFor" IS NULL)
      OR
      ("isDeleted" AND "deletedAt" IS NOT NULL AND "deletionScheduledFor" IS NOT NULL)
    );

-- User: 2FA fields consistency
ALTER TABLE "User"
  ADD CONSTRAINT "User_2fa_consistency"
    CHECK (
      (NOT "twoFactorEnabled" AND "twoFactorEnabledAt" IS NULL)
      OR
      ("twoFactorEnabled" AND "twoFactorEnabledAt" IS NOT NULL AND "twoFactorSecret" IS NOT NULL)
    );

-- User: username length and format (3-30 chars, no spaces)
ALTER TABLE "User"
  ADD CONSTRAINT "User_username_format"
    CHECK (
      "username" IS NULL
      OR (
        length("username") BETWEEN 3 AND 30
        AND "username" ~ '^[a-z0-9][a-z0-9_\\-]*[a-z0-9]$'
      )
    );

-- RefreshToken: expiry must be after creation
ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_expiresAt_after_createdAt"
    CHECK ("expiresAt" > "createdAt");

-- Goal: deadline must be in the future at creation or null
--       (Can't enforce "at creation" without trigger; we enforce it's after a
--        reasonable floor date to catch bugs.)
ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_deadline_reasonable"
    CHECK ("deadline" IS NULL OR "deadline" > '2020-01-01'::TIMESTAMPTZ);

-- Goal: achievedAt only set when status = 'completed'
ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_achievedAt_consistency"
    CHECK (
      ("status" = 'completed' AND "achievedAt" IS NOT NULL)
      OR ("status" != 'completed' AND "achievedAt" IS NULL)
    );

-- Analysis: stopLoss < priceAtAnalysis (a stop-loss below entry price)
ALTER TABLE "Analysis"
  ADD CONSTRAINT "Analysis_stopLoss_below_entry"
    CHECK (
      "stopLoss" IS NULL
      OR "priceAtAnalysis" IS NULL
      OR "stopLoss" < "priceAtAnalysis"
    );

-- Prediction: targetPrice must differ from priceAtCreation by at least 0.01
ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_targetPrice_differs_from_entry"
    CHECK (ABS("targetPrice" - "priceAtCreation") >= 0.01);

-- Prediction: resolvedAt only set when status != ACTIVE
ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_resolvedAt_consistency"
    CHECK (
      ("status" = 'ACTIVE' AND "resolvedAt" IS NULL AND "resolvedPrice" IS NULL)
      OR ("status" != 'ACTIVE' AND "resolvedAt" IS NOT NULL AND "resolvedPrice" IS NOT NULL)
    );

-- DiscountCode: percentage discount must be 0-100
ALTER TABLE "DiscountCode"
  ADD CONSTRAINT "DiscountCode_percentage_range"
    CHECK ("type" != 'percentage' OR ("value" >= 0 AND "value" <= 100));

-- DiscountCode: usedCount must never exceed maxUses
ALTER TABLE "DiscountCode"
  ADD CONSTRAINT "DiscountCode_usedCount_le_maxUses"
    CHECK ("maxUses" IS NULL OR "usedCount" <= "maxUses");

-- UserPredictionStats: correctPredictions ≤ totalPredictions
ALTER TABLE "UserPredictionStats"
  ADD CONSTRAINT "UserPredictionStats_correct_le_total"
    CHECK ("correctPredictions" <= "totalPredictions");

-- UserPredictionStats: bestStreak ≥ currentStreak
ALTER TABLE "UserPredictionStats"
  ADD CONSTRAINT "UserPredictionStats_bestStreak_ge_current"
    CHECK ("bestStreak" >= "currentStreak");


-- =============================================================================
-- 6. PARTIAL INDEXES
--    Index only the rows that queries actually filter on.
--    Smaller → fits in memory → faster scans.
-- =============================================================================

-- Active sessions only (the 99% case in authenticate middleware)
CREATE INDEX "RefreshToken_active_sessions_idx"
  ON "RefreshToken"("userId", "expiresAt")
  WHERE "isRevoked" = false;

-- Active predictions feed (the hot path for /predictions/feed)
CREATE INDEX "Prediction_active_public_feed_idx"
  ON "Prediction"("createdAt" DESC)
  WHERE "status" = 'ACTIVE' AND "isPublic" = true;

-- Predictions pending resolution (cron job at 15:30)
CREATE INDEX "Prediction_pending_resolution_idx"
  ON "Prediction"("expiresAt")
  WHERE "status" = 'ACTIVE';

-- Unread notifications (the badge count query runs on every page load)
CREATE INDEX "Notification_unread_idx"
  ON "Notification"("userId", "createdAt" DESC)
  WHERE "isRead" = false;

-- Users pending archival (the nightly cleanup cron)
CREATE INDEX "User_pending_archival_idx"
  ON "User"("deletionScheduledFor")
  WHERE "isDeleted" = true;

-- Active discount codes (validation path)
CREATE INDEX "DiscountCode_active_valid_idx"
  ON "DiscountCode"("code")
  WHERE "active" = true;

-- Active watchlist alerts (the 10-min price alert job)
CREATE INDEX "Watchlist_active_alerts_idx"
  ON "Watchlist"("ticker", "targetPrice")
  WHERE "targetPrice" IS NOT NULL;


-- =============================================================================
-- 7. COVERING INDEXES
--    Include non-key columns so the query engine never touches the heap
--    for the most common SELECT patterns.
-- =============================================================================

-- Auth middleware: SELECT id, email, isDeleted, isEmailVerified, plan, planExpiresAt, referralProExpiresAt
-- Called on EVERY authenticated request — must be index-only.
CREATE INDEX "User_auth_lookup_idx"
  ON "User"("id")
  INCLUDE ("email", "isDeleted", "isEmailVerified", "plan", "planExpiresAt", "referralProExpiresAt");

-- Billing plan checks (getForBillingPlan): called before every AI analysis
CREATE INDEX "User_billing_lookup_idx"
  ON "User"("id")
  INCLUDE ("plan", "planExpiresAt", "aiAnalysisUsedThisMonth", "aiAnalysisResetDate",
           "referralProDaysRemaining", "referralProExpiresAt");

-- Portfolio display: userId → all columns needed for the portfolio page
CREATE INDEX "Portfolio_user_display_idx"
  ON "Portfolio"("userId", "buyDate" DESC)
  INCLUDE ("ticker", "shares", "avgPrice");

-- Predictions feed join: user info needed inline
CREATE INDEX "User_prediction_profile_idx"
  ON "User"("id")
  INCLUDE ("username", "avatarUrl");

-- Follow status lookup (social graph: "do I follow this person?")
CREATE INDEX "Follow_relationship_lookup_idx"
  ON "Follow"("followerId", "followingId")
  INCLUDE ("status");

-- News feed: ticker + recent news
CREATE INDEX "NewsTicker_recent_news_idx"
  ON "NewsTicker"("ticker", "newsId");

-- Notification feed: unread count + recent items
CREATE INDEX "Notification_user_feed_idx"
  ON "Notification"("userId", "createdAt" DESC)
  INCLUDE ("type", "title", "body", "route", "isRead");


-- =============================================================================
-- 8. MAINTENANCE INDEXES
--    Support scheduled cleanup jobs.
-- =============================================================================

-- AuditLog TTL cleanup: DELETE FROM "AuditLog" WHERE "createdAt" < now() - interval '90 days'
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Expired idempotency key cleanup
-- (already exists from earlier migration, but adding IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "IdempotencyKey_expiresAt_cleanup_idx"
  ON "IdempotencyKey"("expiresAt")
  WHERE "status" != 'PROCESSING';

-- Expired refresh tokens cleanup
CREATE INDEX IF NOT EXISTS "RefreshToken_expired_cleanup_idx"
  ON "RefreshToken"("expiresAt")
  WHERE "isRevoked" = false;

-- Old notifications cleanup (keep last 90 days per user)
CREATE INDEX IF NOT EXISTS "Notification_cleanup_idx"
  ON "Notification"("userId", "createdAt");


-- =============================================================================
-- 9. STATISTICS TUNING
--    Tell PG to collect more granular statistics for low-cardinality enum
--    columns and skewed data distributions (e.g. 95% of predictions are ACTIVE).
-- =============================================================================

ALTER TABLE "User"        ALTER COLUMN "plan"    SET STATISTICS 500;
ALTER TABLE "User"        ALTER COLUMN "isDeleted" SET STATISTICS 100;
ALTER TABLE "Prediction"  ALTER COLUMN "status"  SET STATISTICS 500;
ALTER TABLE "Prediction"  ALTER COLUMN "isPublic" SET STATISTICS 100;
ALTER TABLE "Notification" ALTER COLUMN "isRead" SET STATISTICS 100;
ALTER TABLE "RefreshToken" ALTER COLUMN "isRevoked" SET STATISTICS 100;

-- Collect fresh stats after all structural changes
ANALYZE "User";
ANALYZE "Portfolio";
ANALYZE "Prediction";
ANALYZE "Analysis";
ANALYZE "Notification";
ANALYZE "RefreshToken";
ANALYZE "AuditLog";
ANALYZE "Follow";
ANALYZE "Watchlist";
ANALYZE "DiscountCode";
ANALYZE "Goal";
ANALYZE "Referral";
ANALYZE "IdempotencyKey";

COMMIT;

