-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vaccine" ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false;
