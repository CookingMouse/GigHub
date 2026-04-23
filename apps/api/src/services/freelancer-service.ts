import { Prisma } from "@prisma/client";
import {
  submissionRevisionLimit,
  type FreelancerJobRecord,
  type FreelancerMilestoneDetailRecord,
  type FreelancerMilestoneSummaryRecord,
  type SubmissionRecord
} from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { extractFileMetadata } from "./file-metadata-service";
import { removeStoredSubmissionFile, storeSubmissionFile } from "./file-storage-service";

const freelancerJobInclude = {
  company: {
    include: {
      companyProfile: true
    }
  },
  milestones: {
    include: {
      submissions: {
        orderBy: {
          revision: "asc"
        }
      }
    },
    orderBy: {
      sequence: "asc"
    }
  }
} satisfies Prisma.JobInclude;

const freelancerMilestoneInclude = {
  job: {
    include: {
      company: {
        include: {
          companyProfile: true
        }
      },
      brief: true
    }
  },
  submissions: {
    orderBy: {
      revision: "asc"
    }
  }
} satisfies Prisma.MilestoneInclude;

type FreelancerJob = Prisma.JobGetPayload<{
  include: typeof freelancerJobInclude;
}>;

type FreelancerMilestone = Prisma.MilestoneGetPayload<{
  include: typeof freelancerMilestoneInclude;
}>;

const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const companyNameForJob = (job: FreelancerJob | FreelancerMilestone["job"]) =>
  job.company.companyProfile?.companyName ?? job.company.name;

const toSubmissionRecord = (
  submission: FreelancerMilestone["submissions"][number]
): SubmissionRecord => ({
  id: submission.id,
  revision: submission.revision,
  status: submission.status,
  notes: submission.notes ?? null,
  fileName: submission.fileName ?? null,
  fileFormat: submission.fileFormat ?? null,
  fileSizeBytes: submission.fileSizeBytes ?? null,
  fileHash: submission.fileHash ?? null,
  wordCount: submission.wordCount ?? null,
  dimensions: submission.dimensions ?? null,
  submittedAt: submission.submittedAt.toISOString(),
  reviewedAt: submission.reviewedAt?.toISOString() ?? null
});

const toMilestoneSummaryRecord = (
  milestone: FreelancerJob["milestones"][number]
): FreelancerMilestoneSummaryRecord => ({
  id: milestone.id,
  sequence: milestone.sequence,
  title: milestone.title,
  description: milestone.description ?? "",
  status: milestone.status,
  dueAt: milestone.dueAt?.toISOString() ?? null,
  revisionCount: milestone.submissions.length,
  remainingRevisions: Math.max(submissionRevisionLimit - milestone.submissions.length, 0)
});

const toFreelancerJobRecord = (job: FreelancerJob): FreelancerJobRecord => ({
  id: job.id,
  title: job.title,
  status: job.status,
  companyName: companyNameForJob(job),
  milestones: job.milestones.map(toMilestoneSummaryRecord)
});

const toFreelancerMilestoneDetailRecord = (
  milestone: FreelancerMilestone
): FreelancerMilestoneDetailRecord => ({
  id: milestone.id,
  sequence: milestone.sequence,
  title: milestone.title,
  description: milestone.description ?? "",
  status: milestone.status,
  dueAt: milestone.dueAt?.toISOString() ?? null,
  job: {
    id: milestone.job.id,
    title: milestone.job.title,
    companyName: companyNameForJob(milestone.job)
  },
  brief: {
    overview: milestone.job.brief?.overview ?? "",
    deliverables: normalizeStringArray(milestone.job.brief?.deliverables),
    acceptanceCriteria: normalizeStringArray(milestone.job.brief?.acceptanceCriteria)
  },
  revisionCount: milestone.submissions.length,
  remainingRevisions: Math.max(submissionRevisionLimit - milestone.submissions.length, 0),
  submissionHistory: milestone.submissions.map(toSubmissionRecord)
});

const findFreelancerMilestoneOrThrow = async (freelancerId: string, milestoneId: string) => {
  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      job: {
        freelancerId
      }
    },
    include: freelancerMilestoneInclude
  });

  if (!milestone) {
    throw new HttpError(
      404,
      "MILESTONE_NOT_FOUND",
      "That milestone could not be found in the freelancer workspace."
    );
  }

  return milestone;
};

const ensureSubmittableMilestone = (milestone: FreelancerMilestone) => {
  if (milestone.job.status !== "IN_PROGRESS") {
    throw new HttpError(
      409,
      "SUBMISSION_LOCKED",
      "Submissions are only available after funding and milestone setup have moved the job into progress."
    );
  }

  if (["APPROVED", "RELEASED", "DISPUTED"].includes(milestone.status)) {
    throw new HttpError(
      409,
      "SUBMISSION_LOCKED",
      "This milestone is no longer open for freelancer submissions."
    );
  }

  if (milestone.submissions.length >= submissionRevisionLimit) {
    throw new HttpError(
      409,
      "SUBMISSION_REVISION_LIMIT_REACHED",
      `This milestone has reached the ${submissionRevisionLimit}-revision limit for the current phase.`
    );
  }
};

export const listFreelancerJobs = async (freelancerId: string) => {
  const jobs = await prisma.job.findMany({
    where: {
      freelancerId
    },
    include: freelancerJobInclude,
    orderBy: {
      updatedAt: "desc"
    }
  });

  return jobs.map(toFreelancerJobRecord);
};

export const getFreelancerMilestoneDetail = async (freelancerId: string, milestoneId: string) =>
  toFreelancerMilestoneDetailRecord(await findFreelancerMilestoneOrThrow(freelancerId, milestoneId));

export const createFreelancerSubmission = async (
  freelancerId: string,
  milestoneId: string,
  file: Express.Multer.File | undefined,
  notes: string
) => {
  if (!file) {
    throw new HttpError(
      400,
      "SUBMISSION_FILE_REQUIRED",
      "Attach one primary file before sending the milestone submission."
    );
  }

  const milestone = await findFreelancerMilestoneOrThrow(freelancerId, milestoneId);
  ensureSubmittableMilestone(milestone);

  const nextRevision = milestone.submissions.length + 1;
  const submittedAt = new Date();
  const metadata = await extractFileMetadata(file.buffer, file.originalname);
  const storedFile = await storeSubmissionFile({
    fileBuffer: file.buffer,
    format: metadata.format
  });

  try {
    const updatedMilestone = await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          milestoneId: milestone.id,
          revision: nextRevision,
          status: "PENDING_REVIEW",
          notes: notes || null,
          fileName: file.originalname,
          fileFormat: metadata.format,
          fileSizeBytes: file.size,
          fileHash: storedFile.fileHash,
          wordCount: metadata.wordCount,
          dimensions: metadata.dimensions,
          submittedAt,
          activityLog: [
            {
              type: "submission.created",
              actorId: freelancerId,
              occurredAt: submittedAt.toISOString(),
              storageKey: storedFile.storageKey,
              retentionExpiresAt: storedFile.retentionExpiresAt.toISOString(),
              fileFormat: metadata.format,
              fileSizeBytes: file.size
            }
          ]
        }
      });

      await tx.milestone.update({
        where: {
          id: milestone.id
        },
        data: {
          status: "SUBMITTED",
          submittedAt
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: freelancerId,
          entityType: "milestone",
          entityId: milestone.id,
          eventType: "submission.created",
          payload: {
            revision: nextRevision,
            fileFormat: metadata.format,
            fileHash: storedFile.fileHash
          }
        }
      });

      return tx.milestone.findUniqueOrThrow({
        where: {
          id: milestone.id
        },
        include: freelancerMilestoneInclude
      });
    });

    return toFreelancerMilestoneDetailRecord(updatedMilestone);
  } catch (error) {
    await removeStoredSubmissionFile(storedFile.storageKey);
    throw error;
  }
};
