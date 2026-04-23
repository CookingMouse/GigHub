-- CreateEnum
CREATE TYPE "JobInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CompanyProfile"
ADD COLUMN "about" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "website" TEXT;

-- AlterTable
ALTER TABLE "FreelancerProfile"
ADD COLUMN "bio" TEXT,
ADD COLUMN "experienceYears" INTEGER,
ADD COLUMN "headline" TEXT,
ADD COLUMN "pastProjects" JSONB,
ADD COLUMN "resumeFileName" TEXT,
ADD COLUMN "resumeStorageKey" TEXT,
ADD COLUMN "resumeUploadedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JobInvitation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "note" TEXT,
    "status" "JobInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "JobInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationThread" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "createdById" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobInvitation_companyId_status_idx" ON "JobInvitation"("companyId", "status");

-- CreateIndex
CREATE INDEX "JobInvitation_freelancerId_status_idx" ON "JobInvitation"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "JobInvitation_jobId_status_idx" ON "JobInvitation"("jobId", "status");

-- CreateIndex
CREATE INDEX "ConversationThread_jobId_idx" ON "ConversationThread"("jobId");

-- CreateIndex
CREATE INDEX "ConversationThread_updatedAt_idx" ON "ConversationThread"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_threadId_userId_key" ON "ConversationParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationMessage_threadId_createdAt_idx" ON "ConversationMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobInvitation" ADD CONSTRAINT "JobInvitation_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
