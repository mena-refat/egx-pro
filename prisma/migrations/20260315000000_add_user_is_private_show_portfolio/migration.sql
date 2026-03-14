-- AlterTable: add isPrivate and showPortfolio to User (for profile/social settings)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showPortfolio" BOOLEAN NOT NULL DEFAULT true;
