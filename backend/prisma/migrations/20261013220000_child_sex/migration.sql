-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "sex" "Sex";
