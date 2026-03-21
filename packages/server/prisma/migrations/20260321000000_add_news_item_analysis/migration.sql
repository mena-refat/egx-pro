-- CreateTable: NewsItemAnalysis
-- Persistent store for AI-generated news analysis results.
-- Keyed by SHA-256 of (title|description) — survives Redis restarts.
-- Redis is still used as L1 hot cache (1h TTL); this table is the source of truth.

CREATE TABLE "NewsItemAnalysis" (
    "id"          TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "result"      JSONB NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsItemAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsItemAnalysis_contentHash_key" ON "NewsItemAnalysis"("contentHash");
CREATE INDEX "NewsItemAnalysis_impactLevel_idx" ON "NewsItemAnalysis"("impactLevel");
CREATE INDEX "NewsItemAnalysis_createdAt_idx"   ON "NewsItemAnalysis"("createdAt");
