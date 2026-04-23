import { Prisma } from "@prisma/client";
import type {
  AdminAuditLogRecord,
  AdminDisputeDetailRecord,
  AdminDisputeListRecord,
  AdminIncomeStatementRecord,
  AdminJobTraceRecord,
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

type DecisionShape = {
  decisionType: "BRIEF_VALIDATION" | "MILESTONE_SCORING" | "DISPUTE_ANALYSIS";
  overallScore: number | null;
  passFail: string | null;
  recommendation: string | null;
  requirementScores: Prisma.JsonValue | null;
  badFaithFlags: Prisma.JsonValue | null;
  reasoning: string | null;
  createdAt: Date;
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
    | DecisionShape
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

const toAuditLogRecord = (auditLog: {
  id: string;
  actor: {
    name: string;
    email: string;
  } | null;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
}): AdminAuditLogRecord => ({
  id: auditLog.id,
  actorName: auditLog.actor?.name ?? null,
  actorEmail: auditLog.actor?.email ?? null,
  entityType: auditLog.entityType,
  entityId: auditLog.entityId,
  eventType: auditLog.eventType,
  payload: auditLog.payload,
  createdAt: auditLog.createdAt.toISOString()
});

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

const toTraceSubmissionRecord = (submission: {
  id: string;
  revision: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "DISPUTED";
  notes: string | null;
  reviewDecision: string | null;
  rejectionReason: string | null;
  fileName: string | null;
  fileFormat: string | null;
  fileSizeBytes: number | null;
  fileHash: string | null;
  wordCount: number | null;
  dimensions: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}): SubmissionRecord => ({
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

export const listAdminAuditLogs = async (): Promise<AdminAuditLogRecord[]> => {
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      actor: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return auditLogs.map(toAuditLogRecord);
};

export const listAdminIncomeStatements = async (): Promise<AdminIncomeStatementRecord[]> => {
  const statements = await prisma.incomeStatement.findMany({
    include: {
      freelancer: true
    },
    orderBy: {
      generatedAt: "desc"
    },
    take: 50
  });

  return statements.map((statement) => ({
    id: statement.id,
    freelancerName: statement.freelancer.name,
    freelancerEmail: statement.freelancer.email,
    periodStart: statement.periodStart.toISOString(),
    periodEnd: statement.periodEnd.toISOString(),
    totalEarned: Number(statement.totalEarned),
    totalJobs: statement.totalJobs,
    totalMilestones: statement.totalMilestones,
    generatedAt: statement.generatedAt.toISOString(),
    verifyToken: statement.verifyToken,
    status: statement.status
  }));
};

export const getAdminJobTrace = async (jobId: string): Promise<AdminJobTraceRecord> => {
  const job = await prisma.job.findUnique({
    where: {
      id: jobId
    },
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
      },
      escrow: true,
      glmDecisions: {
        orderBy: {
          createdAt: "desc"
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
    }
  });

  if (!job) {
    throw new HttpError(404, "JOB_TRACE_NOT_FOUND", "That job trace could not be found.");
  }

  const milestoneIds = job.milestones.map((milestone) => milestone.id);
  const submissionIds = job.milestones.flatMap((milestone) =>
    milestone.submissions.map((submission) => submission.id)
  );
  const disputeIds = job.milestones.flatMap((milestone) =>
    milestone.submissions.flatMap((submission) => (submission.dispute ? [submission.dispute.id] : []))
  );
  const escrowReleaseIds = await prisma.escrowRelease.findMany({
    where: {
      milestoneId: {
        in: milestoneIds
      }
    },
    select: {
      id: true
    }
  });
  const traceEntityIds = [
    job.id,
    job.escrow?.id ?? "",
    ...milestoneIds,
    ...submissionIds,
    ...disputeIds,
    ...escrowReleaseIds.map((release) => release.id)
  ].filter(Boolean);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityId: {
        in: traceEntityIds
      }
    },
    include: {
      actor: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return {
    id: job.id,
    title: job.title,
    status: job.status,
    companyName: job.company.companyProfile?.companyName ?? job.company.name,
    freelancerName:
      job.freelancer?.freelancerProfile?.displayName ?? job.freelancer?.name ?? null,
    escrow: job.escrow
      ? {
          status: job.escrow.status,
          fundedAmount: Number(job.escrow.fundedAmount),
          releasedAmount: Number(job.escrow.releasedAmount),
          provider: job.escrow.provider ?? null,
          providerReference: job.escrow.providerReference ?? null,
          fundedAt: job.escrow.fundedAt?.toISOString() ?? null,
          releasedAt: job.escrow.releasedAt?.toISOString() ?? null
        }
      : null,
    milestones: job.milestones.map((milestone) => {
      const submission = milestone.submissions[0] ?? null;

      return {
        id: milestone.id,
        sequence: milestone.sequence,
        title: milestone.title,
        description: milestone.description ?? "",
        amount: Number(milestone.amount),
        status: milestone.status,
        dueAt: milestone.dueAt?.toISOString() ?? null,
        submittedAt: milestone.submittedAt?.toISOString() ?? null,
        approvedAt: milestone.approvedAt?.toISOString() ?? null,
        releasedAt: milestone.releasedAt?.toISOString() ?? null,
        reviewDueAt: milestone.reviewDueAt?.toISOString() ?? null,
        revisionRequestedAt: milestone.revisionRequestedAt?.toISOString() ?? null,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
        latestSubmission: submission ? toTraceSubmissionRecord(submission) : null,
        latestDecision: toDecisionRecord(submission?.glmDecisions[0] ?? null),
        activeDispute: submission?.dispute
          ? {
              id: submission.dispute.id,
              status: submission.dispute.status,
              rejectionReason: submission.dispute.rejectionReason,
              resolutionType: submission.dispute.resolutionType ?? null,
              resolutionSummary: submission.dispute.resolutionSummary ?? null,
              adminNote: submission.dispute.adminNote ?? null,
              openedAt: submission.dispute.openedAt.toISOString(),
              resolvedAt: submission.dispute.resolvedAt?.toISOString() ?? null,
              latestDecision: toDecisionRecord(submission.dispute.glmDecisions[0] ?? null)
            }
          : null
      };
    }),
    glmDecisions: job.glmDecisions.map(toDecisionRecord).filter((decision) => decision !== null),
    auditLogs: auditLogs.map(toAuditLogRecord)
  };
};
