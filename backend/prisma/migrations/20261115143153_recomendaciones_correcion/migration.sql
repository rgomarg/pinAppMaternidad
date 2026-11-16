/*
  Warnings:

  - Made the column `ageFor` on table `Recipe` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Recipe" ALTER COLUMN "ageFor" SET NOT NULL;
