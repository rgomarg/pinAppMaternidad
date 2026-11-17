CREATE TYPE "ProfileRole" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN');
ALTER TABLE "User" ADD COLUMN "profileRole" "ProfileRole" NOT NULL DEFAULT 'MOTHER';

UPDATE "User" SET "profileRole" = 'FATHER'
WHERE "email" = 'carlos.user@example.com';
UPDATE "User" SET "profileRole" = 'GUARDIAN'
WHERE "email" = 'admin@example.com';
