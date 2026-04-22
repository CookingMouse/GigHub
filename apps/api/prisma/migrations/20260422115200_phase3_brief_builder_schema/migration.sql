-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "milestoneCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "JobBrief"
ADD COLUMN "lastValidatedAt" TIMESTAMP(3);
