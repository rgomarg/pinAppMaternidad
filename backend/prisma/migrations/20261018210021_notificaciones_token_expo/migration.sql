-- AlterTable
ALTER TABLE "Child" ALTER COLUMN "sex" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushToken" TEXT;
