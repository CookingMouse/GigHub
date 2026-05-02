-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'ESCROW_FUNDED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('UNFUNDED', 'FUNDED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'REFUNDED', 'HELD');

-- CreateEnum
CREATE TYPE "EscrowReleaseTrigger" AS ENUM ('CLIENT_APPROVAL', 'AUTO_RELEASE', 'ADMIN_RULING');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RELEASED', 'DISPUTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GLMDecisionType" AS ENUM ('BRIEF_VALIDATION', 'MILESTONE_SCORING', 'DISPUTE_ANALYSIS');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('GENERATED', 'VERIFIED', 'REVOKED');

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "ratingAverage" DECIMAL(4,2),
ADD COLUMN     "skills" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;

UPDATE "User"
SET "name" = CASE
  WHEN "role" = 'admin' THEN 'GigHub Admin'
  ELSE split_part("email", '@', 1)
END;

UPDATE "User" AS u
SET "name" = fp."displayName"
FROM "FreelancerProfile" AS fp
WHERE fp."userId" = u."id";

UPDATE "User" AS u
SET "name" = cp."companyName"
FROM "CompanyProfile" AS cp
WHERE cp."userId" = u."id";

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "freelancerId" TEXT,
    "title" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBrief" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "overview" TEXT,
    "scope" JSONB,
    "deliverables" JSONB,
    "requirements" JSONB,
    "acceptanceCriteria" JSONB,
    "timeline" JSONB,
    "briefData" JSONB,
    "glmBriefScore" INTEGER,
    "glmValidationSummary" TEXT,
    "glmGaps" JSONB,
    "glmClarifyingQuestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "coverNote" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'UNFUNDED',
    "fundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provider" TEXT,
    "providerReference" TEXT,
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "heldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowRelease" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "trigger" "EscrowReleaseTrigger" NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "fileName" TEXT,
    "fileFormat" TEXT,
    "fileSizeBytes" INTEGER,
    "fileHash" TEXT,
    "wordCount" INTEGER,
    "dimensions" TEXT,
    "activityLog" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "rejectionReason" TEXT NOT NULL,
    "resolutionSummary" TEXT,
    "adminNote" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLMDecision" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "submissionId" TEXT,
    "disputeId" TEXT,
    "decisionType" "GLMDecisionType" NOT NULL,
    "overallScore" INTEGER,
    "passFail" TEXT,
    "recommendation" TEXT,
    "requirementScores" JSONB,
    "badFaithFlags" JSONB,
    "reasoning" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GLMDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeStatement" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalEarned" DECIMAL(12,2) NOT NULL,
    "totalJobs" INTEGER NOT NULL,
    "totalMilestones" INTEGER NOT NULL,
    "avgMonthlyIncome" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfStorageKey" TEXT,
    "verifyToken" TEXT NOT NULL,
    "glmNarrative" TEXT,
    "status" "StatementStatus" NOT NULL DEFAULT 'GENERATED',

    CONSTRAINT "IncomeStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeStatementLineItem" (
    "id" TEXT NOT NULL,
    "incomeStatementId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,

    CONSTRAINT "IncomeStatementLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_freelancerId_idx" ON "Job"("freelancerId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobBrief_jobId_key" ON "JobBrief"("jobId");

-- CreateIndex
CREATE INDEX "JobApplication_freelancerId_idx" ON "JobApplication"("freelancerId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_freelancerId_key" ON "JobApplication"("jobId", "freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_jobId_key" ON "Escrow"("jobId");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE INDEX "EscrowRelease_milestoneId_idx" ON "EscrowRelease"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowRelease_escrowId_milestoneId_key" ON "EscrowRelease"("escrowId", "milestoneId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_jobId_sequence_key" ON "Milestone"("jobId", "sequence");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_milestoneId_revision_key" ON "Submission"("milestoneId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_submissionId_key" ON "Dispute"("submissionId");

-- CreateIndex
CREATE INDEX "Dispute_raisedById_idx" ON "Dispute"("raisedById");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "GLMDecision_jobId_idx" ON "GLMDecision"("jobId");

-- CreateIndex
CREATE INDEX "GLMDecision_decisionType_idx" ON "GLMDecision"("decisionType");

-- CreateIndex
CREATE INDEX "Notification_recipientId_idx" ON "Notification"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_deliveryStatus_idx" ON "Notification"("deliveryStatus");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeStatement_verifyToken_key" ON "IncomeStatement"("verifyToken");

-- CreateIndex
CREATE INDEX "IncomeStatement_freelancerId_idx" ON "IncomeStatement"("freelancerId");

-- CreateIndex
CREATE INDEX "IncomeStatement_status_idx" ON "IncomeStatement"("status");

-- CreateIndex
CREATE INDEX "IncomeStatementLineItem_milestoneId_idx" ON "IncomeStatementLineItem"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeStatementLineItem_incomeStatementId_milestoneId_key" ON "IncomeStatementLineItem"("incomeStatementId", "milestoneId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBrief" ADD CONSTRAINT "JobBrief_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRelease" ADD CONSTRAINT "EscrowRelease_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRelease" ADD CONSTRAINT "EscrowRelease_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLMDecision" ADD CONSTRAINT "GLMDecision_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLMDecision" ADD CONSTRAINT "GLMDecision_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLMDecision" ADD CONSTRAINT "GLMDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLMDecision" ADD CONSTRAINT "GLMDecision_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeStatement" ADD CONSTRAINT "IncomeStatement_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeStatementLineItem" ADD CONSTRAINT "IncomeStatementLineItem_incomeStatementId_fkey" FOREIGN KEY ("incomeStatementId") REFERENCES "IncomeStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeStatementLineItem" ADD CONSTRAINT "IncomeStatementLineItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GLMDecision target integrity
ALTER TABLE "GLMDecision"
ADD CONSTRAINT "GLMDecision_target_check"
CHECK (
  (
    "decisionType" = 'BRIEF_VALIDATION'
    AND "milestoneId" IS NULL
    AND "submissionId" IS NULL
    AND "disputeId" IS NULL
  )
  OR
  (
    "decisionType" <> 'BRIEF_VALIDATION'
    AND (
      (CASE WHEN "milestoneId" IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN "submissionId" IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN "disputeId" IS NOT NULL THEN 1 ELSE 0 END)
    ) = 1
  )
);
