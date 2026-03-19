CREATE TYPE "NewsSourceType" AS ENUM ('NEWS_API', 'GOOGLE_RSS', 'EGX_DISCLOSURE');

CREATE TABLE "NewsItem" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "source" TEXT NOT NULL,
  "sourceType" "NewsSourceType" NOT NULL,
  "url" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isMarketWide" BOOLEAN NOT NULL DEFAULT false,
  "language" TEXT,
  "sentiment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsTicker" (
  "newsId" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,

  CONSTRAINT "NewsTicker_pkey" PRIMARY KEY ("newsId","ticker")
);

CREATE UNIQUE INDEX "NewsItem_externalId_key" ON "NewsItem"("externalId");
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt");
CREATE INDEX "NewsItem_sourceType_publishedAt_idx" ON "NewsItem"("sourceType", "publishedAt");
CREATE INDEX "NewsItem_isMarketWide_publishedAt_idx" ON "NewsItem"("isMarketWide", "publishedAt");
CREATE INDEX "NewsTicker_ticker_idx" ON "NewsTicker"("ticker");

ALTER TABLE "NewsTicker"
ADD CONSTRAINT "NewsTicker_newsId_fkey"
FOREIGN KEY ("newsId") REFERENCES "NewsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
