import { Prisma, type JobBrief, type JobStatus } from "@prisma/client";
import {
  jobValidationThreshold,
  type JobBriefRecord,
  type JobRecord,
  type JobTimeline,
  type UpsertJobDraftInput
} from "@gighub/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import {
  deterministicBriefValidationProvider,
  type BriefValidationProvider
} from "./brief-validation-service";

const companyJobInclude = {
  brief: true
} satisfies Prisma.JobInclude;

type CompanyJob = Prisma.JobGetPayload<{
  include: typeof companyJobInclude;
}>;

type JobValidationPayload = JobBriefRecord["validation"];

const emptyTimeline: JobTimeline = {
  startDate: "",
  endDate: "",
  notes: ""
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
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
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
