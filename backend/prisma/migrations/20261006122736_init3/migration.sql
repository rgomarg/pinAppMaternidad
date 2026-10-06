/*
  Warnings:

  - The values [VOMIT,WEAKNESS] on the enum `TagCondition` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TagCondition_new" AS ENUM ('HEADACHE', 'FEVER', 'COUGH', 'SORE_THROAT', 'RUNNY_NOSE', 'NASAL_CONGESTION', 'SNEEZING', 'STOMACHACHE', 'CRAMPS', 'NAUSEA', 'VOMITING', 'DIARRHEA', 'CONSTIPATION', 'DIZZINESS', 'FATIGUE', 'EARACHE', 'TOOTHACHE', 'RASH', 'ITCHING', 'WATERY_EYES', 'RED_EYES', 'LOSS_OF_APPETITE', 'MUSCLE_PAIN', 'JOINT_PAIN', 'CHILLS', 'SHORTNESS_OF_BREATH', 'WHEEZING', 'SWOLLEN_GLANDS', 'TROUBLE_SLEEPING', 'IRRITABILITY');
ALTER TABLE "Condition" ALTER COLUMN "tag" TYPE "TagCondition_new"[] USING ("tag"::text::"TagCondition_new"[]);
ALTER TYPE "TagCondition" RENAME TO "TagCondition_old";
ALTER TYPE "TagCondition_new" RENAME TO "TagCondition";
DROP TYPE "TagCondition_old";
COMMIT;
