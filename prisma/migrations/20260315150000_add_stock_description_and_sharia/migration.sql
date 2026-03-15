-- AlterTable: إضافة وصف وتصنيف الشريعة للأسهم (GICS + شريعة)
ALTER TABLE "Stock" ADD COLUMN "description" TEXT;
ALTER TABLE "Stock" ADD COLUMN "isShariaCompliant" BOOLEAN;

-- CreateIndex
CREATE INDEX "Stock_isShariaCompliant_idx" ON "Stock"("isShariaCompliant");
