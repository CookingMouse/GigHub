import { randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { HttpError } from "../lib/http-error";

type ReleaseTrigger = "CLIENT_APPROVAL" | "AUTO_RELEASE";

type TransactionClient = Prisma.TransactionClient;

const releaseInclude = {
  job: {
    include: {
      escrow: true,
      milestones: {
        orderBy: {
          sequence: "asc"
        }
      }
    }
  },
  submissions: {
    orderBy: {
      revision: "desc"
    }
  },
  escrowReleases: true
} satisfies Prisma.MilestoneInclude;

type ReleaseMilestone = Prisma.MilestoneGetPayload<{
  include: typeof releaseInclude;
}>;

const releaseLockKey = (milestoneId: string) => `escrow-release:${milestoneId}`;

const loadMilestoneForRelease = async (
  client: PrismaClient | TransactionClient,
  milestoneId: string
) =>
  client.milestone.findUnique({
    where: {
      id: milestoneId
    },
    include: releaseInclude
  });

const nextEscrowStatus = (
  currentReleasedAmount: Prisma.Decimal,
  milestoneAmount: Prisma.Decimal,
  fundedAmount: Prisma.Decimal
) => {
  const updatedReleasedAmount = currentReleasedAmount.plus(milestoneAmount);

  if (updatedReleasedAmount.gte(fundedAmount)) {
    return {
      releasedAmount: updatedReleasedAmount,
      status: "FULLY_RELEASED" as const
    };
  }

  return {
    releasedAmount: updatedReleasedAmount,
    status: "PARTIALLY_RELEASED" as const
  };
};

const deriveJobStatusAfterRelease = async (client: TransactionClient, jobId: string) => {
  const [openDisputes, pendingMilestones] = await Promise.all([
    client.dispute.count({
      where: {
        status: {
          in: ["OPEN", "UNDER_REVIEW"]
        },
        submission: {
          milestone: {
            jobId
          }
        }
      }
    }),
    client.milestone.count({
      where: {
        jobId,
        status: {
          not: "RELEASED"
        }
      }
    })
  ]);

  if (openDisputes > 0) {
    return "DISPUTED" as const;
  }

  if (pendingMilestones === 0) {
    return "COMPLETED" as const;
  }

  return "IN_PROGRESS" as const;
};

const reviewDecisionForTrigger = (trigger: ReleaseTrigger) => {
  if (trigger === "CLIENT_APPROVAL") {
    return "COMPANY_APPROVED";
  }

  return "AUTO_RELEASED";
};

export const applyMilestoneRelease = async (
  client: TransactionClient,
  milestoneId: string,
  actorId: string | null,
  trigger: ReleaseTrigger
) => {
  const milestone = await loadMilestoneForRelease(client, milestoneId);

  if (!milestone) {
    throw new HttpError(404, "MILESTONE_NOT_FOUND", "That milestone could not be found.");
  }

  if (!milestone.job.escrow) {
    throw new HttpError(
      409,
      "ESCROW_NOT_FOUND",
      "Escrow must exist before GigHub can release milestone funds."
    );
  }

  if (milestone.escrowReleases.length > 0 || milestone.status === "RELEASED") {
    return {
      duplicate: true
    };
  }

  const releasedAt = new Date();
  const latestSubmission = milestone.submissions[0] ?? null;
  const escrowUpdate = nextEscrowStatus(
    milestone.job.escrow.releasedAmount,
    milestone.amount,
    milestone.job.escrow.fundedAmount
  );

  await client.escrowRelease.create({
    data: {
      escrowId: milestone.job.escrow.id,
      milestoneId: milestone.id,
      amount: milestone.amount,
      trigger,
      releasedAt
    }
  });

  await client.milestone.update({
    where: {
      id: milestone.id
    },
    data: {
      status: "RELEASED",
      approvedAt: milestone.approvedAt ?? releasedAt,
      releasedAt,
      reviewDueAt: null
    }
  });

  if (latestSubmission) {
    await client.submission.update({
      where: {
        id: latestSubmission.id
      },
      data: {
        status: "APPROVED",
        reviewDecision: reviewDecisionForTrigger(trigger),
        reviewedAt: releasedAt
      }
    });
  }

  await client.escrow.update({
    where: {
      id: milestone.job.escrow.id
    },
    data: {
      releasedAmount: escrowUpdate.releasedAmount,
      status: escrowUpdate.status,
      releasedAt: escrowUpdate.status === "FULLY_RELEASED" ? releasedAt : milestone.job.escrow.releasedAt
    }
  });

  const nextJobStatus = await deriveJobStatusAfterRelease(client, milestone.jobId);

  await client.job.update({
    where: {
      id: milestone.jobId
    },
    data: {
      status: nextJobStatus
    }
  });

  await client.activityLog.create({
    data: {
      actorId,
      entityType: "milestone",
      entityId: milestone.id,
      eventType: "escrow.released",
      payload: {
        trigger,
        releasedAt: releasedAt.toISOString(),
        amount: Number(milestone.amount)
      }
    }
  });

  return {
    duplicate: false
  };
};

export const runWithMilestoneReleaseLock = async <T>(
  milestoneId: string,
  callback: () => Promise<T>
) => {
  const token = randomUUID();
  const key = releaseLockKey(milestoneId);
  const accepted = await redis.set(key, token, {
    NX: true,
    EX: 30
  });

  if (accepted === null) {
    throw new HttpError(
      409,
      "ESCROW_RELEASE_IN_PROGRESS",
      "Another release operation is already running for this milestone."
    );
  }

  try {
    return await callback();
  } finally {
    const storedToken = await redis.get(key);

    if (storedToken === token) {
      await redis.del(key);
    }
  }
};

export const releaseMilestoneEscrow = async (
  milestoneId: string,
  actorId: string | null,
  trigger: ReleaseTrigger
) =>
  runWithMilestoneReleaseLock(milestoneId, async () =>
    prisma.$transaction((tx) => applyMilestoneRelease(tx, milestoneId, actorId, trigger))
  );
