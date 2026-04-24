import { Prisma } from "@prisma/client";
import {
  submissionRevisionLimit,
  type DisputeRecord,
  type FreelancerJobRecord,
  type FreelancerMilestoneDetailRecord,
  type FreelancerMilestoneSummaryRecord,
  type GLMDecisionRecord,
  type SubmissionRecord
} from "@gighub/shared";
import { env } from "../lib/env";
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
          revision: "desc"
        },
        include: {
          dispute: {
            include: {
              glmDecisions: {
                where: {
                  decisionType: "DISPUTE_ANALYSIS"
                },
                orderBy: {
                  createdAt: "desc"
                }
              }
            }
          },
          glmDecisions: {
            where: {
              decisionType: "MILESTONE_SCORING"
            },
            orderBy: {
              createdAt: "desc"
            }
          }
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
      revision: "desc"
    },
    include: {
      dispute: {
        include: {
          glmDecisions: {
            where: {
              decisionType: "DISPUTE_ANALYSIS"
            },
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      },
      glmDecisions: {
        where: {
          decisionType: "MILESTONE_SCORING"
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  }
} satisfies Prisma.MilestoneInclude;

type FreelancerJob = Prisma.JobGetPayload<{
  include: typeof freelancerJobInclude;
}>;

type FreelancerMilestone = Prisma.MilestoneGetPayload<{
  include: typeof freelancerMilestoneInclude;
}>;

type FreelancerSubmission = FreelancerMilestone["submissions"][number];

const reviewWindowMs = env.REVIEW_WINDOW_HOURS * 60 * 60 * 1000;

const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeRequirementScores = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;

    if (typeof record.requirement !== "string" || typeof record.score !== "number") {
      return [];
    }

    return [
      {
        requirement: record.requirement,
        score: record.score
      }
    ];
  });
};

const companyNameForJob = (job: FreelancerJob | FreelancerMilestone["job"]) =>
  job.company.companyProfile?.companyName ?? job.company.name;

const toDecisionRecord = (
  decision:
    | FreelancerSubmission["glmDecisions"][number]
    | NonNullable<NonNullable<FreelancerSubmission["dispute"]>["glmDecisions"]>[number]
    | null
): GLMDecisionRecord | null => {
  if (!decision) {
    return null;
  }

  return {
    decisionType: decision.decisionType,
    overallScore: decision.overallScore ?? null,
    passFail: decision.passFail ?? null,
    recommendation: decision.recommendation ?? null,
    requirementScores: normalizeRequirementScores(decision.requirementScores),
    badFaithFlags: normalizeStringArray(decision.badFaithFlags),
    reasoning: decision.reasoning ?? null,
    createdAt: decision.createdAt.toISOString()
  };
};

const toDisputeRecord = (dispute: FreelancerSubmission["dispute"] | null): DisputeRecord | null => {
  if (!dispute) {
    return null;
  }

  return {
    id: dispute.id,
    status: dispute.status,
    rejectionReason: dispute.rejectionReason,
    resolutionType: dispute.resolutionType ?? null,
    resolutionSummary: dispute.resolutionSummary ?? null,
    openedAt: dispute.openedAt.toISOString(),
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    latestDecision: toDecisionRecord(dispute.glmDecisions[0] ?? null)
  };
};

const toSubmissionRecord = (submission: FreelancerSubmission): SubmissionRecord => ({
  id: submission.id,
  revision: submission.revision,
  status: submission.status,
  notes: submission.notes ?? null,
  reviewDecision: submission.reviewDecision ?? null,
  rejectionReason: submission.rejectionReason ?? null,
  fileName: submission.fileName ?? null,
  fileFormat: submission.fileFormat ?? null,
  fileSizeBytes: submission.fileSizeBytes ?? null,
  fileHash: submission.fileHash ?? null,
  wordCount: submission.wordCount ?? null,
  dimensions: submission.dimensions ?? null,
  submittedAt: submission.submittedAt.toISOString(),
  reviewedAt: submission.reviewedAt?.toISOString() ?? null
});

const latestSubmissionForMilestone = (milestone: FreelancerMilestone | FreelancerJob["milestones"][number]) =>
  milestone.submissions[0] ?? null;

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
  remainingRevisions: Math.max(submissionRevisionLimit - milestone.submissions.length, 0),
  reviewDueAt: milestone.reviewDueAt?.toISOString() ?? null
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
  reviewDueAt: milestone.reviewDueAt?.toISOString() ?? null,
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
  latestDecision: toDecisionRecord(latestSubmissionForMilestone(milestone)?.glmDecisions[0] ?? null),
  activeDispute: toDisputeRecord(latestSubmissionForMilestone(milestone)?.dispute ?? null),
  submissionHistory: milestone.submissions.slice().reverse().map(toSubmissionRecord)
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

  if (["UNDER_REVIEW", "APPROVED", "RELEASED", "DISPUTED"].includes(milestone.status)) {
    throw new HttpError(
      409,
      "SUBMISSION_LOCKED",
      "This milestone is not open for another freelancer submission right now."
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
  const reviewDueAt = new Date(submittedAt.getTime() + reviewWindowMs);

  try {
    const updatedMilestone = await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          milestoneId: milestone.id,
          revision: nextRevision,
          status: "PENDING_REVIEW",
          notes: notes || null,
          reviewDecision: null,
          fileName: file.originalname,
          fileFormat: metadata.format,
          fileSizeBytes: file.size,
          fileHash: storedFile.fileHash,
          wordCount: metadata.wordCount,
          dimensions: metadata.dimensions,
          submittedAt,
          reviewedAt: null,
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
          status: "UNDER_REVIEW",
          submittedAt,
          reviewDueAt,
          revisionRequestedAt: null
        }
      });

      await tx.activityLog.create({
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
