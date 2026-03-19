-- Migration: improve_schema
-- All structural changes were applied via `prisma db push`.
-- This file records the migration in the history.
--
-- Changes applied:
--   • Added enums: UserPlan, RiskTolerance, GoalStatus, ReferralStatus,
--                  BlockedIdentifierType, IdempotencyStatus
--   • User.interestedSectors: String → Json
--   • AuditLog: removed ipAddress (keep ipHash only)
--   • AdminAuditLog: removed ipAddress, added ipHash
--   • AuditLog.metadata: String → Json
--   • Referral relation renamed: User_Referral_referredUserIdToUser → referredUser
--   • Watchlist: removed redundant index (covered by unique constraint)
--   • PredictionLike: added createdAt
--   • DiscountUsage: added usedAt
--   • User: added @@index([isDeleted, lastLoginAt])
--   • ArchivedUser: id changed to cuid()
--   • Schema organized into logical sections

SELECT 1; -- no-op: changes already applied via db push
