/*
  Warnings:

  - Added the required column `childId` to the `Disease` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Disease" ADD COLUMN     "childId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Disease" ADD CONSTRAINT "Disease_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
