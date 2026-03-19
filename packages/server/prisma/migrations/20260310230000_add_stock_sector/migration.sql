-- CreateEnum
CREATE TYPE "GicsSector" AS ENUM ('INFORMATION_TECHNOLOGY', 'HEALTH_CARE', 'FINANCIALS', 'CONSUMER_DISCRETIONARY', 'CONSUMER_STAPLES', 'ENERGY', 'INDUSTRIALS', 'MATERIALS', 'UTILITIES', 'REAL_ESTATE', 'COMMUNICATION_SERVICES');

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sector" "GicsSector",

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_ticker_key" ON "Stock"("ticker");

-- CreateIndex
CREATE INDEX "Stock_sector_idx" ON "Stock"("sector");
