"use client";

import type {
  AdminDisputeDetailRecord,
  AdminDisputeListRecord,
  AdminAuditLogRecord,
  AdminIncomeStatementRecord,
  AdminJobTraceRecord,
  ApiErrorResponse,
  AssignFreelancerInput,
  FreelancerJobRecord,
  FreelancerDirectoryRecord,
  FreelancerMilestoneDetailRecord,
  GenerateIncomeStatementInput,
  IncomeStatementRecord,
  IncomeSummaryRecord,
  JobMatchRecord,
  JobRecord,
  LoginInput,
  MilestonePlanInput,
  MockPaymentIntentRecord,
  PublicUser,
  RejectMilestoneInput,
  RegisterInput,
  ResolveDisputeInput,
  UpsertJobDraftInput
} from "@gighub/shared";
import { webConfig } from "./config";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const requestJson = async <T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> => {
  const headers = new Headers(init.headers);

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${webConfig.apiBaseUrl}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers,
    body: init.json === undefined ? init.body : JSON.stringify(init.json)
  });

  const payload = (await response.json().catch(() => null)) as
    | { data: T }
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;

    throw new ApiRequestError(
      errorPayload?.message ?? "The request failed.",
      response.status,
      errorPayload?.code
    );
  }

  return (payload as { data: T }).data;
};

const requestFormData = async <T>(
  path: string,
  formData: FormData,
  init: Omit<RequestInit, "body"> = {}
): Promise<T> => {
  const response = await fetch(`${webConfig.apiBaseUrl}/api/v1${path}`, {
    ...init,
    credentials: "include",
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | { data: T }
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | null;

    throw new ApiRequestError(
      errorPayload?.message ?? "The request failed.",
      response.status,
      errorPayload?.code
    );
  }

  return (payload as { data: T }).data;
};

export const authApi = {
  register: (input: RegisterInput) =>
    requestJson<{ user: PublicUser }>("/auth/register", {
      method: "POST",
      json: input
    }),
  login: (input: LoginInput) =>
    requestJson<{ user: PublicUser }>("/auth/login", {
      method: "POST",
      json: input
    }),
  logout: () =>
    requestJson<{ success: boolean }>("/auth/logout", {
      method: "POST"
    }),
  me: () =>
    requestJson<{ user: PublicUser }>("/auth/me", {
      method: "GET"
    }),
  refresh: () =>
    requestJson<{ user: PublicUser }>("/auth/refresh", {
      method: "POST"
    })
};

export const restoreSessionUser = async () => {
  try {
    const session = await authApi.me();
    return session.user;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await authApi.refresh();
      const session = await authApi.me();
      return session.user;
    }

    throw error;
  }
};

export const jobsApi = {
  list: () =>
    requestJson<{ jobs: JobRecord[] }>("/jobs", {
      method: "GET"
    }),
  get: (jobId: string) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}`, {
      method: "GET"
    }),
  create: (input: UpsertJobDraftInput) =>
    requestJson<{ job: JobRecord }>("/jobs", {
      method: "POST",
      json: input
    }),
  update: (jobId: string, input: UpsertJobDraftInput) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}`, {
      method: "PATCH",
      json: input
    }),
  assign: (jobId: string, input: AssignFreelancerInput) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}/assign`, {
      method: "POST",
      json: input
    }),
  createEscrowIntent: (jobId: string) =>
    requestJson<{ intent: MockPaymentIntentRecord }>(`/jobs/${jobId}/escrow/intent`, {
      method: "POST"
    }),
  saveMilestones: (jobId: string, input: MilestonePlanInput) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}/milestones`, {
      method: "PUT",
      json: input
    }),
  approveMilestone: (jobId: string, milestoneId: string) =>
    requestJson<{ job: JobRecord; duplicate: boolean }>(
      `/jobs/${jobId}/milestones/${milestoneId}/approve`,
      {
        method: "POST"
      }
    ),
  rejectMilestone: (jobId: string, milestoneId: string, input: RejectMilestoneInput) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}/milestones/${milestoneId}/reject`, {
      method: "POST",
      json: input
    }),
  runAutoReleaseCheck: (jobId: string, milestoneId: string) =>
    requestJson<{ job: JobRecord; duplicate: boolean }>(
      `/jobs/${jobId}/milestones/${milestoneId}/auto-release/check`,
      {
        method: "POST"
      }
    ),
  validate: (jobId: string) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}/validate`, {
      method: "POST"
    }),
  publish: (jobId: string) =>
    requestJson<{ job: JobRecord }>(`/jobs/${jobId}/publish`, {
      method: "POST"
    })
};

export const freelancersApi = {
  list: () =>
    requestJson<{ freelancers: FreelancerDirectoryRecord[] }>("/freelancers", {
      method: "GET"
    })
};

export const paymentsApi = {
  simulateSuccess: (intentId: string, eventId: string) =>
    requestJson<{
      accepted: boolean;
      duplicate: boolean;
      job: JobRecord;
    }>("/webhooks/payments/mock", {
      method: "POST",
      json: {
        eventId,
        intentId,
        type: "payment.succeeded"
      }
    })
};

export const freelancerWorkspaceApi = {
  listJobs: () =>
    requestJson<{ jobs: FreelancerJobRecord[] }>("/freelancer/jobs", {
      method: "GET"
    }),
  getMilestone: (milestoneId: string) =>
    requestJson<{ milestone: FreelancerMilestoneDetailRecord }>(`/freelancer/milestones/${milestoneId}`, {
      method: "GET"
    }),
  createSubmission: (milestoneId: string, input: { file: File; notes: string }) => {
    const formData = new FormData();
    formData.set("file", input.file);
    formData.set("notes", input.notes);

    return requestFormData<{ milestone: FreelancerMilestoneDetailRecord }>(
      `/freelancer/milestones/${milestoneId}/submissions`,
      formData,
      {
        method: "POST"
      }
    );
  },
  getIncome: () =>
    requestJson<{
      summary: IncomeSummaryRecord;
      statements: IncomeStatementRecord[];
    }>("/freelancer/income", {
      method: "GET"
    }),
  generateIncomeStatement: (input: GenerateIncomeStatementInput) =>
    requestJson<{ statement: IncomeStatementRecord }>("/freelancer/income/statements", {
      method: "POST",
      json: input
    }),
  listJobMatches: () =>
    requestJson<{ matches: JobMatchRecord[] }>("/freelancer/job-matches", {
      method: "GET"
    })
};

export const adminApi = {
  listDisputes: () =>
    requestJson<{ disputes: AdminDisputeListRecord[] }>("/admin/disputes", {
      method: "GET"
    }),
  getDispute: (disputeId: string) =>
    requestJson<{ dispute: AdminDisputeDetailRecord }>(`/admin/disputes/${disputeId}`, {
      method: "GET"
    }),
  resolveDispute: (disputeId: string, input: ResolveDisputeInput) =>
    requestJson<{ dispute: AdminDisputeDetailRecord }>(`/admin/disputes/${disputeId}/resolve`, {
      method: "POST",
      json: input
    }),
  getAudit: () =>
    requestJson<{
      auditLogs: AdminAuditLogRecord[];
      incomeStatements: AdminIncomeStatementRecord[];
    }>("/admin/audit-logs", {
      method: "GET"
    }),
  getJobTrace: (jobId: string) =>
    requestJson<{ trace: AdminJobTraceRecord }>(`/admin/jobs/${jobId}/trace`, {
      method: "GET"
    })
};

export const incomeStatementsApi = {
  verify: (verifyToken: string) =>
    requestJson<{ statement: IncomeStatementRecord }>(
      `/income-statements/verify/${verifyToken}`,
      {
        method: "GET"
      }
    )
};
