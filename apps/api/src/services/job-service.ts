import { Prisma, type JobBrief, type JobStatus } from "@prisma/client";
import {
  milestonePlanSchema,
  jobValidationThreshold,
  type FreelancerDirectoryRecord,
  type JobBriefRecord,
  type JobRecord,
  type JobTimeline,
  type MilestonePlanInput,
  type MilestoneRecord,
  type MockPaymentIntentRecord,
  type MockPaymentWebhookInput,
  type UpsertJobDraftInput
} from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { redis } from "../lib/redis";
import {
  deterministicBriefValidationProvider,
  type BriefValidationProvider
} from "./brief-validation-service";
import { mockPaymentProvider } from "./mock-payment-service";

const companyJobInclude = {
  brief: true,
  freelancer: {
    include: {
      freelancerProfile: true
    }
  },
  escrow: true,
  milestones: {
    orderBy: {
      sequence: "asc"
    }
  }
} satisfies Prisma.JobInclude;

type CompanyJob = Prisma.JobGetPayload<{
  include: typeof companyJobInclude;
}>;
type FreelancerWithProfile = Prisma.UserGetPayload<{
  include: {
    freelancerProfile: true;
  };
}>;

type JobValidationPayload = JobBriefRecord["validation"];

const emptyTimeline: JobTimeline = {
  startDate: "",
  endDate: "",
  notes: ""
};

const normalizeSkills = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeStringArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeTimeline = (value: Prisma.JsonValue | null | undefined): JobTimeline => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return emptyTimeline;
  }

  const record = value as Record<string, unknown>;

  return {
    startDate: typeof record.startDate === "string" ? record.startDate : "",
    endDate: typeof record.endDate === "string" ? record.endDate : "",
    notes: typeof record.notes === "string" ? record.notes : ""
  };
};

const buildBriefData = (input: UpsertJobDraftInput) => ({
  title: input.title,
  budget: input.budget,
  milestoneCount: input.milestoneCount,
  ...input.brief
});

const toFreelancerDirectoryRecord = (
  freelancer: FreelancerWithProfile | CompanyJob["freelancer"] | null
): FreelancerDirectoryRecord | null => {
  if (!freelancer) {
    return null;
  }

  return {
    id: freelancer.id,
    name: freelancer.name,
    displayName: freelancer.freelancerProfile?.displayName ?? freelancer.name,
    portfolioUrl: freelancer.freelancerProfile?.portfolioUrl ?? null,
    skills: normalizeSkills(freelancer.freelancerProfile?.skills),
    hourlyRate: freelancer.freelancerProfile?.hourlyRate
      ? Number(freelancer.freelancerProfile.hourlyRate)
      : null,
    ratingAverage: freelancer.freelancerProfile?.ratingAverage
      ? Number(freelancer.freelancerProfile.ratingAverage)
      : null
  };
};

const toMilestoneRecord = (milestone: CompanyJob["milestones"][number]): MilestoneRecord => ({
  id: milestone.id,
  sequence: milestone.sequence,
  title: milestone.title,
  description: milestone.description ?? "",
  amount: Number(milestone.amount),
  status: milestone.status,
  dueAt: milestone.dueAt?.toISOString() ?? null,
  createdAt: milestone.createdAt.toISOString(),
  updatedAt: milestone.updatedAt.toISOString()
});

const isValidationStale = (brief: Pick<JobBrief, "updatedAt" | "lastValidatedAt"> | null) => {
  if (!brief?.lastValidatedAt) {
    return true;
  }

  return brief.updatedAt.getTime() > brief.lastValidatedAt.getTime();
};

const toValidationPayload = (
  jobStatus: JobStatus,
  brief: CompanyJob["brief"]
): JobValidationPayload => {
  const stale = isValidationStale(brief);
  const score = brief?.glmBriefScore ?? null;

  return {
    score,
    summary: brief?.glmValidationSummary ?? null,
    gaps: normalizeStringArray(brief?.glmGaps),
    clarifyingQuestions: normalizeStringArray(brief?.glmClarifyingQuestions),
    lastValidatedAt: brief?.lastValidatedAt?.toISOString() ?? null,
    isStale: stale,
    canPublish: jobStatus === "DRAFT" && !stale && score !== null && score >= jobValidationThreshold
  };
};

const toJobRecord = (job: CompanyJob): JobRecord => ({
  id: job.id,
  title: job.title,
  budget: Number(job.budget),
  milestoneCount: job.milestoneCount,
  status: job.status,
  publishedAt: job.publishedAt?.toISOString() ?? null,
  assignedAt: job.assignedAt?.toISOString() ?? null,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  assignedFreelancer: toFreelancerDirectoryRecord(job.freelancer),
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
  milestones: job.milestones.map(toMilestoneRecord),
  brief: {
    overview: job.brief?.overview ?? "",
    scope: normalizeStringArray(job.brief?.scope),
    deliverables: normalizeStringArray(job.brief?.deliverables),
    requirements: normalizeStringArray(job.brief?.requirements),
    acceptanceCriteria: normalizeStringArray(job.brief?.acceptanceCriteria),
    timeline: normalizeTimeline(job.brief?.timeline),
    updatedAt: job.brief?.updatedAt.toISOString() ?? job.updatedAt.toISOString(),
    validation: toValidationPayload(job.status, job.brief)
  }
});

const findCompanyJobOrThrow = async (companyId: string, jobId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId
    },
    include: companyJobInclude
  });

  if (!job) {
    throw new HttpError(404, "JOB_NOT_FOUND", "That job could not be found.");
  }

  return job;
};

const ensureDraftStatus = (job: Pick<CompanyJob, "status">, action: string) => {
  if (job.status !== "DRAFT") {
    throw new HttpError(
      409,
      "JOB_NOT_EDITABLE",
      `This job is already ${job.status.toLowerCase()} and cannot ${action}.`
    );
  }
};

const ensureJobStatus = (
  job: Pick<CompanyJob, "status">,
  expectedStatus: JobStatus,
  code: string,
  message: string
) => {
  if (job.status !== expectedStatus) {
    throw new HttpError(409, code, message);
  }
};

const persistBriefValidation = async (
  actorId: string,
  job: CompanyJob,
  input: UpsertJobDraftInput,
  validationProvider: BriefValidationProvider
) => {
  const result = validationProvider.validate(input);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: job.id },
      data: {
        brief: {
          update: {
            glmBriefScore: result.score,
            glmValidationSummary: result.summary,
            glmGaps: result.gaps,
            glmClarifyingQuestions: result.clarifyingQuestions,
            lastValidatedAt: new Date()
          }
        }
      },
      include: companyJobInclude
    });

    await tx.$executeRaw`
      UPDATE "JobBrief"
      SET "lastValidatedAt" = "updatedAt"
      WHERE "jobId" = ${job.id}
    `;

    await tx.gLMDecision.create({
      data: {
        jobId: job.id,
        decisionType: "BRIEF_VALIDATION",
        overallScore: result.score,
        passFail: result.score >= jobValidationThreshold ? "pass" : "fail",
        reasoning: result.summary,
        requirementScores: {
          scopeItems: input.brief.scope.length,
          deliverables: input.brief.deliverables.length,
          requirements: input.brief.requirements.length,
          acceptanceCriteria: input.brief.acceptanceCriteria.length
        },
        rawResponse: result
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "job",
        entityId: job.id,
        eventType: "job.validated",
        payload: {
          score: result.score,
          canPublish: result.score >= jobValidationThreshold
        }
      }
    });

    return tx.job.findUniqueOrThrow({
      where: { id: job.id },
      include: companyJobInclude
    });
  });

  return toJobRecord(updated);
};

export const listCompanyJobs = async (companyId: string) => {
  const jobs = await prisma.job.findMany({
    where: { companyId },
    include: companyJobInclude,
    orderBy: {
      updatedAt: "desc"
    }
  });

  return jobs.map(toJobRecord);
};

export const getCompanyJob = async (companyId: string, jobId: string) =>
  toJobRecord(await findCompanyJobOrThrow(companyId, jobId));

export const createCompanyJob = async (companyId: string, input: UpsertJobDraftInput) => {
  const job = await prisma.$transaction(async (tx) => {
    const createdJob = await tx.job.create({
      data: {
        companyId,
        title: input.title,
        budget: new Prisma.Decimal(input.budget),
        milestoneCount: input.milestoneCount,
        brief: {
          create: {
            overview: input.brief.overview,
            scope: input.brief.scope,
            deliverables: input.brief.deliverables,
            requirements: input.brief.requirements,
            acceptanceCriteria: input.brief.acceptanceCriteria,
            timeline: input.brief.timeline,
            briefData: buildBriefData(input)
          }
        }
      },
      include: companyJobInclude
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: createdJob.id,
        eventType: "job.created",
        payload: {
          status: createdJob.status,
          milestoneCount: createdJob.milestoneCount
        }
      }
    });

    return createdJob;
  });

  return toJobRecord(job);
};

export const updateCompanyJob = async (companyId: string, jobId: string, input: UpsertJobDraftInput) => {
  const existingJob = await findCompanyJobOrThrow(companyId, jobId);

  ensureDraftStatus(existingJob, "be edited");

  const updatedJob = await prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id: existingJob.id },
      data: {
        title: input.title,
        budget: new Prisma.Decimal(input.budget),
        milestoneCount: input.milestoneCount,
        brief: {
          update: {
            overview: input.brief.overview,
            scope: input.brief.scope,
            deliverables: input.brief.deliverables,
            requirements: input.brief.requirements,
            acceptanceCriteria: input.brief.acceptanceCriteria,
            timeline: input.brief.timeline,
            briefData: buildBriefData(input)
          }
        }
      },
      include: companyJobInclude
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: existingJob.id,
        eventType: "job.updated",
        payload: {
          title: input.title,
          milestoneCount: input.milestoneCount
        }
      }
    });

    return job;
  });

  return toJobRecord(updatedJob);
};

export const validateCompanyJob = async (
  companyId: string,
  jobId: string,
  validationProvider: BriefValidationProvider = deterministicBriefValidationProvider
) => {
  const job = await findCompanyJobOrThrow(companyId, jobId);

  ensureDraftStatus(job, "be validated");

  const input: UpsertJobDraftInput = {
    title: job.title,
    budget: Number(job.budget),
    milestoneCount: job.milestoneCount,
    brief: {
      overview: job.brief?.overview ?? "",
      scope: normalizeStringArray(job.brief?.scope),
      deliverables: normalizeStringArray(job.brief?.deliverables),
      requirements: normalizeStringArray(job.brief?.requirements),
      acceptanceCriteria: normalizeStringArray(job.brief?.acceptanceCriteria),
      timeline: normalizeTimeline(job.brief?.timeline)
    }
  };

  return persistBriefValidation(companyId, job, input, validationProvider);
};

export const publishCompanyJob = async (companyId: string, jobId: string) => {
  const job = await findCompanyJobOrThrow(companyId, jobId);

  ensureDraftStatus(job, "be published");

  const validation = toValidationPayload(job.status, job.brief);

  if (validation.score === null) {
    throw new HttpError(
      409,
      "JOB_VALIDATION_REQUIRED",
      "Validate the brief before publishing this job."
    );
  }

  if (validation.isStale) {
    throw new HttpError(
      409,
      "JOB_VALIDATION_STALE",
      "Recent edits made the validation outdated. Validate the brief again before publishing."
    );
  }

  if (!validation.canPublish) {
    throw new HttpError(
      409,
      "JOB_VALIDATION_FAILED",
      "The brief score is below the publish threshold. Resolve the flagged gaps and validate again."
    );
  }

  const publishedAt = new Date();

  const publishedJob = await prisma.$transaction(async (tx) => {
    const updatedJob = await tx.job.update({
      where: { id: job.id },
      data: {
        status: "OPEN",
        publishedAt
      },
      include: companyJobInclude
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: job.id,
        eventType: "job.published",
        payload: {
          publishedAt: publishedAt.toISOString(),
          score: validation.score
        }
      }
    });

    return updatedJob;
  });

  return toJobRecord(publishedJob);
};

export const listAssignableFreelancers = async () => {
  const freelancers = await prisma.user.findMany({
    where: {
      role: "freelancer"
    },
    include: {
      freelancerProfile: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return freelancers.map((freelancer) => toFreelancerDirectoryRecord(freelancer)!);
};

export const assignFreelancerToJob = async (
  companyId: string,
  jobId: string,
  freelancerId: string
) => {
  const [job, freelancer] = await Promise.all([
    findCompanyJobOrThrow(companyId, jobId),
    prisma.user.findFirst({
      where: {
        id: freelancerId,
        role: "freelancer"
      },
      include: {
        freelancerProfile: true
      }
    })
  ]);

  ensureJobStatus(
    job,
    "OPEN",
    "JOB_ASSIGNMENT_UNAVAILABLE",
    "Only published jobs can be assigned to a freelancer."
  );

  if (!freelancer) {
    throw new HttpError(404, "FREELANCER_NOT_FOUND", "That freelancer could not be found.");
  }

  const assignedAt = new Date();

  const updatedJob = await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: {
        id: job.id
      },
      data: {
        freelancerId: freelancer.id,
        assignedAt,
        status: "ASSIGNED"
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: job.id,
        eventType: "job.assigned",
        payload: {
          freelancerId: freelancer.id,
          assignedAt: assignedAt.toISOString()
        }
      }
    });

    return tx.job.findUniqueOrThrow({
      where: { id: job.id },
      include: companyJobInclude
    });
  });

  return toJobRecord(updatedJob);
};

export const createMockEscrowIntent = async (
  companyId: string,
  jobId: string
): Promise<MockPaymentIntentRecord> => {
  const job = await findCompanyJobOrThrow(companyId, jobId);

  ensureJobStatus(
    job,
    "ASSIGNED",
    "ESCROW_INTENT_UNAVAILABLE",
    "Escrow can only be funded after a freelancer has been assigned."
  );

  if (!job.freelancerId) {
    throw new HttpError(
      409,
      "ESCROW_ASSIGNMENT_REQUIRED",
      "A freelancer must be assigned before escrow can be funded."
    );
  }

  if (job.escrow?.status === "FUNDED") {
    throw new HttpError(409, "ESCROW_ALREADY_FUNDED", "Escrow is already funded for this job.");
  }

  if (job.escrow?.provider === "mock" && job.escrow.providerReference) {
    return {
      intentId: job.escrow.providerReference,
      amount: Number(job.budget),
      currency: "MYR",
      provider: "mock",
      status: "requires_confirmation"
    };
  }

  const intent = mockPaymentProvider.createIntent({
    amount: Number(job.budget)
  });

  await prisma.$transaction(async (tx) => {
    await tx.escrow.upsert({
      where: {
        jobId: job.id
      },
      update: {
        provider: intent.provider,
        providerReference: intent.intentId,
        status: "UNFUNDED"
      },
      create: {
        jobId: job.id,
        provider: intent.provider,
        providerReference: intent.intentId,
        status: "UNFUNDED"
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: job.id,
        eventType: "escrow.intent_created",
        payload: {
          provider: intent.provider,
          intentId: intent.intentId,
          amount: intent.amount
        }
      }
    });
  });

  return intent;
};

export const handleMockPaymentWebhook = async (input: MockPaymentWebhookInput) => {
  const idempotencyKey = `payment-event:${input.eventId}`;
  const accepted = await redis.set(idempotencyKey, input.intentId, {
    NX: true,
    EX: 60 * 60 * 24
  });

  const loadCurrentJob = async () => {
    const escrow = await prisma.escrow.findFirst({
      where: {
        provider: "mock",
        providerReference: input.intentId
      }
    });

    if (!escrow) {
      throw new HttpError(404, "PAYMENT_INTENT_NOT_FOUND", "That mock payment intent was not found.");
    }

    const job = await prisma.job.findUniqueOrThrow({
      where: {
        id: escrow.jobId
      },
      include: companyJobInclude
    });

    return toJobRecord(job);
  };

  if (accepted === null) {
    return {
      accepted: true,
      duplicate: true,
      job: await loadCurrentJob()
    };
  }

  const escrow = await prisma.escrow.findFirst({
    where: {
      provider: "mock",
      providerReference: input.intentId
    },
    include: {
      job: true
    }
  });

  if (!escrow) {
    throw new HttpError(404, "PAYMENT_INTENT_NOT_FOUND", "That mock payment intent was not found.");
  }

  const fundedAt = escrow.fundedAt ?? new Date();

  const updatedJob = await prisma.$transaction(async (tx) => {
    await tx.escrow.update({
      where: {
        id: escrow.id
      },
      data: {
        status: "FUNDED",
        fundedAmount: escrow.job.budget,
        provider: "mock",
        providerReference: input.intentId,
        fundedAt
      }
    });

    if (escrow.job.status === "ASSIGNED") {
      await tx.job.update({
        where: {
          id: escrow.jobId
        },
        data: {
          status: "ESCROW_FUNDED"
        }
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "job",
        entityId: escrow.jobId,
        eventType: "escrow.funded",
        payload: {
          provider: "mock",
          intentId: input.intentId,
          eventId: input.eventId,
          fundedAt: fundedAt.toISOString()
        }
      }
    });

    return tx.job.findUniqueOrThrow({
      where: { id: escrow.jobId },
      include: companyJobInclude
    });
  });

  return {
    accepted: true,
    duplicate: false,
    job: toJobRecord(updatedJob)
  };
};

export const replaceJobMilestones = async (
  companyId: string,
  jobId: string,
  input: MilestonePlanInput
) => {
  const parsed = milestonePlanSchema.parse(input);
  const job = await findCompanyJobOrThrow(companyId, jobId);

  ensureJobStatus(
    job,
    "ESCROW_FUNDED",
    "MILESTONE_SETUP_LOCKED",
    "Milestones can only be configured after escrow is funded."
  );

  if (parsed.milestones.length !== job.milestoneCount) {
    throw new HttpError(
      400,
      "MILESTONE_COUNT_MISMATCH",
      `This job expects ${job.milestoneCount} milestone(s).`
    );
  }

  const totalAmount = parsed.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  if (Math.abs(totalAmount - Number(job.budget)) > 0.005) {
    throw new HttpError(
      400,
      "MILESTONE_TOTAL_MISMATCH",
      "Milestone amounts must add up to the funded job budget."
    );
  }

  const milestones = parsed.milestones
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map((milestone) => {
      if (milestone.dueAt) {
        const parsedDate = new Date(milestone.dueAt);

        if (Number.isNaN(parsedDate.getTime())) {
          throw new HttpError(
            400,
            "MILESTONE_DUE_DATE_INVALID",
            "Every milestone due date must be a valid date."
          );
        }
      }

      return milestone;
    });

  const updatedJob = await prisma.$transaction(async (tx) => {
    await tx.milestone.deleteMany({
      where: {
        jobId: job.id
      }
    });

    await tx.milestone.createMany({
      data: milestones.map((milestone) => ({
        jobId: job.id,
        sequence: milestone.sequence,
        title: milestone.title,
        description: milestone.description,
        amount: new Prisma.Decimal(milestone.amount),
        dueAt: milestone.dueAt ? new Date(milestone.dueAt) : null
      }))
    });

    await tx.job.update({
      where: {
        id: job.id
      },
      data: {
        status: "IN_PROGRESS"
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: companyId,
        entityType: "job",
        entityId: job.id,
        eventType: "milestones.defined",
        payload: {
          count: milestones.length,
          totalAmount
        }
      }
    });

    return tx.job.findUniqueOrThrow({
      where: { id: job.id },
      include: companyJobInclude
    });
  });

  return toJobRecord(updatedJob);
};
