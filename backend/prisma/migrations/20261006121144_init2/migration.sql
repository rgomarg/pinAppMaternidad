/*
  Warnings:

  - The `tag` column on the `Condition` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TagCondition" AS ENUM ('FEVER', 'DIZZINESS', 'VOMIT', 'HEADACHE', 'WEAKNESS', 'COUGH');

-- AlterTable
ALTER TABLE "Condition" ADD COLUMN     "desciption" TEXT,
DROP COLUMN "tag",
ADD COLUMN     "tag" "TagCondition"[];

-- AlterTable
ALTER TABLE "Disease" ADD COLUMN     "endDate" TIMESTAMP(3);
