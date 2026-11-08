-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Thread_deletedAt_idx" ON "Thread"("deletedAt");
