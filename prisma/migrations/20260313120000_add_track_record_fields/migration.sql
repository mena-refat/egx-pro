-- AlterTable: add track record fields to Analysis (priceAtAnalysis, targetPrice, stopLoss, verdict, priceAfter7d, priceAfter30d, accuracyScore, accuracyNote, checkedAt)
ALTER TABLE "Analysis" ADD COLUMN IF NOT EXISTS "priceAtAnalysis" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "targetPrice" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "stopLoss" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "verdict" TEXT,
ADD COLUMN IF NOT EXISTS "priceAfter7d" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "priceAfter30d" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "accuracyScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "accuracyNote" TEXT,
ADD COLUMN IF NOT EXISTS "checkedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analysis_checkedAt_idx" ON "Analysis"("checkedAt");
CREATE INDEX IF NOT EXISTS "Analysis_createdAt_idx" ON "Analysis"("createdAt");
