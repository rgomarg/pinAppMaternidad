-- Distinguish pediatricians from users with the PRO package.
ALTER TABLE "User" ADD COLUMN "isPediatrician" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isPediatrician" = true
WHERE "email" = 'elena.admin@example.com';
