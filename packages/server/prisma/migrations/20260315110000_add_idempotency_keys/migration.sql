CREATE TABLE "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "lockedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");
CREATE INDEX "IdempotencyKey_userId_status_expiresAt_idx" ON "IdempotencyKey"("userId", "status", "expiresAt");
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

ALTER TABLE "IdempotencyKey"
ADD CONSTRAINT "IdempotencyKey_responseStatus_required_on_completed"
CHECK ("status" <> 'COMPLETED' OR "responseStatus" IS NOT NULL);

ALTER TABLE "IdempotencyKey"
ADD CONSTRAINT "IdempotencyKey_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
