/*
  Warnings:

  - You are about to drop the column `hasReminder` on the `Event` table. All the data in the column will be lost.
  - Made the column `sex` on table `Child` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT', 'VACCINE', 'MEDICINE', 'COMMUNITY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEDICINE', 'VACCINE', 'MEDICAL_APPOINTMENT', 'GENERAL');

-- AlterTable
ALTER TABLE "Child" ALTER COLUMN "sex" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "hasReminder",
ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'EVENT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER,
    "vaccineId" INTEGER,
    "medicineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_scheduledAt_status_idx" ON "Notification"("scheduledAt", "status");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "Vaccine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
