import { Prisma } from "@prisma/client";
import type {
  AdminDisputeDetailRecord,
  AdminDisputeListRecord,
  DisputeRecord,
  GLMDecisionRecord,
  MilestoneRecord,
  ResolveDisputeInput,
  SubmissionRecord
} from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { applyMilestoneRelease, runWithMilestoneReleaseLock } from "./release-service";

const disputeInclude = {
  submission: {
    include: {
      milestone: {
        include: {
          job: {
            include: {
              company: {
                include: {
                  companyProfile: true
                }
              },
              freelancer: {
                include: {
                  freelancerProfile: true
                }
              }
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
      },
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
      }
    }
  },
  glmDecisions: {
    where: {
      decisionType: "DISPUTE_ANALYSIS"
    },
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.DisputeInclude;

type AdminDispute = Prisma.DisputeGetPayload<{
  include: typeof disputeInclude;
}>;

type AdminSubmission = AdminDispute["submission"];

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

const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const toDecisionRecord = (
  decision:
    | AdminSubmission["glmDecisions"][number]
    | AdminDispute["glmDecisions"][number]
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

const toSubmissionRecord = (submission: AdminSubmission): SubmissionRecord => ({
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

const toDisputeRecord = (dispute: AdminDispute): DisputeRecord => ({
  id: dispute.id,
  status: dispute.status,
  rejectionReason: dispute.rejectionReason,
  resolutionType: dispute.resolutionType ?? null,
  resolutionSummary: dispute.resolutionSummary ?? null,
  adminNote: dispute.adminNote ?? null,
  openedAt: dispute.openedAt.toISOString(),
  resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
  latestDecision: toDecisionRecord(dispute.glmDecisions[0] ?? null)
});

const toMilestoneRecord = (dispute: AdminDispute): MilestoneRecord => ({
  id: dispute.submission.milestone.id,
  sequence: dispute.submission.milestone.sequence,
  title: dispute.submission.milestone.title,
  description: dispute.submission.milestone.description ?? "",
  amount: Number(dispute.submission.milestone.amount),
  status: dispute.submission.milestone.status,
  dueAt: dispute.submission.milestone.dueAt?.toISOString() ?? null,
  submittedAt: dispute.submission.milestone.submittedAt?.toISOString() ?? null,
  approvedAt: dispute.submission.milestone.approvedAt?.toISOString() ?? null,
  releasedAt: dispute.submission.milestone.releasedAt?.toISOString() ?? null,
  reviewDueAt: dispute.submission.milestone.reviewDueAt?.toISOString() ?? null,
  revisionRequestedAt: dispute.submission.milestone.revisionRequestedAt?.toISOString() ?? null,
  createdAt: dispute.submission.milestone.createdAt.toISOString(),
  updatedAt: dispute.submission.milestone.updatedAt.toISOString(),
  latestSubmission: toSubmissionRecord(dispute.submission),
  latestDecision: toDecisionRecord(dispute.submission.glmDecisions[0] ?? null),
  activeDispute: toDisputeRecord(dispute)
});

const companyName = (dispute: AdminDispute) =>
  dispute.submission.milestone.job.company.companyProfile?.companyName ??
  dispute.submission.milestone.job.company.name;

const freelancerName = (dispute: AdminDispute) =>
  dispute.submission.milestone.job.freelancer?.freelancerProfile?.displayName ??
  dispute.submission.milestone.job.freelancer?.name ??
  "Unassigned freelancer";

const findDisputeOrThrow = async (disputeId: string) => {
  const dispute = await prisma.dispute.findUnique({
    where: {
      id: disputeId
    },
    include: disputeInclude
  });

  if (!dispute) {
    throw new HttpError(404, "DISPUTE_NOT_FOUND", "That dispute could not be found.");
  }

  return dispute;
};

export const listAdminDisputes = async (): Promise<AdminDisputeListRecord[]> => {
  const disputes = await prisma.dispute.findMany({
    where: {
      status: {
        in: ["OPEN", "UNDER_REVIEW"]
      }
    },
    include: disputeInclude,
    orderBy: {
      openedAt: "desc"
    }
  });

  return disputes.map((dispute) => ({
    id: dispute.id,
    status: dispute.status,
    jobId: dispute.submission.milestone.jobId,
    jobTitle: dispute.submission.milestone.job.title,
    milestoneId: dispute.submission.milestone.id,
    milestoneTitle: dispute.submission.milestone.title,
    companyName: companyName(dispute),
    freelancerName: freelancerName(dispute),
    rejectionReason: dispute.rejectionReason,
    recommendation: dispute.glmDecisions[0]?.recommendation ?? null,
    badFaithFlags: normalizeStringArray(dispute.glmDecisions[0]?.badFaithFlags),
    openedAt: dispute.openedAt.toISOString()
  }));
};

export const getAdminDisputeDetail = async (disputeId: string): Promise<AdminDisputeDetailRecord> => {
  const dispute = await findDisputeOrThrow(disputeId);

  return {
    id: dispute.id,
    status: dispute.status,
    rejectionReason: dispute.rejectionReason,
    resolutionType: dispute.resolutionType ?? null,
    resolutionSummary: dispute.resolutionSummary ?? null,
    adminNote: dispute.adminNote ?? null,
    openedAt: dispute.openedAt.toISOString(),
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    job: {
      id: dispute.submission.milestone.jobId,
      title: dispute.submission.milestone.job.title,
      companyName: companyName(dispute),
      freelancerName: freelancerName(dispute)
    },
    milestone: toMilestoneRecord(dispute),
    submission: toSubmissionRecord(dispute.submission),
    milestoneDecision: toDecisionRecord(dispute.submission.glmDecisions[0] ?? null),
    disputeDecision: toDecisionRecord(dispute.glmDecisions[0] ?? null)
  };
};

export const resolveAdminDispute = async (
  adminId: string,
  disputeId: string,
  input: ResolveDisputeInput
) => {
  const dispute = await findDisputeOrThrow(disputeId);

  if (!["OPEN", "UNDER_REVIEW"].includes(dispute.status)) {
    throw new HttpError(
      409,
      "DISPUTE_RESOLUTION_UNAVAILABLE",
      "Only open disputes can be resolved."
    );
  }

  const resolvedAt = new Date();

  if (input.outcome === "release_funds") {
    await runWithMilestoneReleaseLock(dispute.submission.milestone.id, async () =>
      prisma.$transaction(async (tx) => {
        await applyMilestoneRelease(
          tx,
          dispute.submission.milestone.id,
          adminId,
          "ADMIN_RULING"
        );

        await tx.dispute.update({
          where: {
            id: dispute.id
          },
          data: {
            status: "RESOLVED",
            resolutionType: input.outcome,
            resolutionSummary: input.resolutionSummary,
            adminNote: input.adminNote || null,
            resolvedAt
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            entityType: "dispute",
            entityId: dispute.id,
            eventType: "dispute.resolved",
            payload: {
              outcome: input.outcome
            }
          }
        });
      })
    );
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: {
          id: dispute.submission.id
        },
        data: {
          status: "REJECTED",
          reviewDecision: "ADMIN_REVISION_REQUESTED",
          reviewedAt: resolvedAt
        }
      });

      await tx.milestone.update({
        where: {
          id: dispute.submission.milestone.id
        },
        data: {
          status: "REVISION_REQUESTED",
          reviewDueAt: null,
          revisionRequestedAt: resolvedAt
        }
      });

      await tx.dispute.update({
        where: {
          id: dispute.id
        },
        data: {
          status: "RESOLVED",
          resolutionType: input.outcome,
          resolutionSummary: input.resolutionSummary,
          adminNote: input.adminNote || null,
          resolvedAt
        }
      });

      const remainingOpenDisputes = await tx.dispute.count({
        where: {
          id: {
            not: dispute.id
          },
          status: {
            in: ["OPEN", "UNDER_REVIEW"]
          },
          submission: {
            milestone: {
              jobId: dispute.submission.milestone.jobId
            }
          }
        }
      });

      await tx.job.update({
        where: {
          id: dispute.submission.milestone.jobId
        },
        data: {
          status: remainingOpenDisputes > 0 ? "DISPUTED" : "IN_PROGRESS"
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          entityType: "dispute",
          entityId: dispute.id,
          eventType: "dispute.resolved",
          payload: {
            outcome: input.outcome
          }
        }
      });
    });
  }

  return getAdminDisputeDetail(disputeId);
};
