-- DropColumn
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "timestamp";

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
