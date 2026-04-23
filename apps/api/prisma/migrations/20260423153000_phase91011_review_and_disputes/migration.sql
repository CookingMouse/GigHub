ALTER TABLE "Milestone"
ADD COLUMN "reviewDueAt" TIMESTAMP(3),
ADD COLUMN "revisionRequestedAt" TIMESTAMP(3);

ALTER TABLE "Submission"
ADD COLUMN "reviewDecision" TEXT,
ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "Dispute"
ADD COLUMN "resolutionType" TEXT;
