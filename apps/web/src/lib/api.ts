"use client";

import type {
  AdminDisputeDetailRecord,
  AdminDisputeListRecord,
  AdminAuditLogRecord,
  AdminIncomeStatementRecord,
  AdminJobTraceRecord,
  ApiErrorResponse,
  AssignFreelancerInput,
  CompanyJobApplicationRecord,
  CompanyJobInvitationRecord,
  CompanyProfileRecord,
  ConversationMessageRecord,
  ConversationThreadRecord,
  CreateConversationMessageInput,
  CreateConversationThreadInput,
  CreateJobApplicationInput,
  CreateJobInvitationInput,
  DemoReadinessRecord,
  FreelancerJobRecord,
  FreelancerDirectoryRecord,
  FreelancerMilestoneDetailRecord,
  FreelancerProfileRecord,
  GenerateIncomeStatementInput,
  IncomeStatementRecord,
  IncomeSummaryRecord,
  JobApplicationRecord,
  JobAvailabilityRecord,
  JobInvitationRecord,
  JobMatchRecord,
  JobRecord,
  LoginInput,
  MilestonePlanInput,
  MockPaymentIntentRecord,
  NotificationRecord,
  PublicUser,
  PublicCompanyProfileRecord,
  RejectMilestoneInput,
  RegisterInput,
  RespondJobInvitationInput,
  ResolveDisputeInput,
  UpdateCompanyProfileInput,
  UpdateFreelancerProfileInput,
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

const requestBlob = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${webConfig.apiBaseUrl}/api/v1${path}`, {
    ...init,
    credentials: "include"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;

    throw new ApiRequestError(
      errorPayload?.message ?? "The request failed.",
      response.status,
      errorPayload?.code
    );
  }

  return {
    blob: await response.blob(),
    fileName:
      response.headers
        .get("content-disposition")
        ?.match(/filename=\"?([^"]+)\"?/)?.[1]
        ?.trim() ?? "download.pdf"
  };
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

export const healthApi = {
  readiness: () =>
    requestJson<{ readiness: DemoReadinessRecord }>("/health/readiness", {
      method: "GET"
    }),
  routes: () =>
    requestJson<{
      routes: {
        requests: boolean;
        profile: boolean;
        inbox: boolean;
      };
    }>("/health/routes", {
      method: "GET"
    })
};

export const requestsApi = {
  listAvailability: () =>
    requestJson<{ jobs: JobAvailabilityRecord[] }>("/requests/freelancer/availability", {
      method: "GET"
    }),
  applyToJob: (jobId: string, input: CreateJobApplicationInput) =>
    requestJson<{ success: boolean }>(`/requests/freelancer/jobs/${jobId}/apply`, {
      method: "POST",
      json: input
    }),
  listFreelancerRequests: () =>
    requestJson<{ applications: JobApplicationRecord[]; invitations: JobInvitationRecord[] }>(
      "/requests/freelancer/applications",
      {
        method: "GET"
      }
    ),
  respondInvitation: (invitationId: string, input: RespondJobInvitationInput) =>
    requestJson<{ success: boolean }>(
      `/requests/freelancer/invitations/${invitationId}/respond`,
      {
        method: "POST",
        json: input
      }
    ),
  listCompanyRequests: () =>
    requestJson<{
      applications: CompanyJobApplicationRecord[];
      invitations: CompanyJobInvitationRecord[];
    }>("/requests/company/requests", {
      method: "GET"
    }),
  resolveApplication: (applicationId: string, action: "accept" | "reject") =>
    requestJson<{ success: boolean }>(`/requests/company/applications/${applicationId}/${action}`, {
      method: "POST"
    }),
  inviteFreelancer: (jobId: string, input: CreateJobInvitationInput) =>
    requestJson<{ success: boolean }>(`/requests/company/jobs/${jobId}/invitations`, {
      method: "POST",
      json: input
    }),
  listWorkerRecommendations: () =>
    requestJson<{ recommendations: WorkerRecommendationRecord[] }>("/requests/company/recommendations", {
      method: "GET"
    })
};

export const inboxApi = {
  listThreads: () =>
    requestJson<{ threads: ConversationThreadRecord[] }>("/inbox/threads", {
      method: "GET"
    }),
  createThread: (input: CreateConversationThreadInput) =>
    requestJson<{ threadId: string }>("/inbox/threads", {
      method: "POST",
      json: input
    }),
  listMessages: (threadId: string) =>
    requestJson<{ messages: ConversationMessageRecord[] }>(`/inbox/threads/${threadId}/messages`, {
      method: "GET"
    }),
  createMessage: (threadId: string, input: CreateConversationMessageInput) =>
    requestJson<{ messageId: string }>(`/inbox/threads/${threadId}/messages`, {
      method: "POST",
      json: input
    }),
  markThreadRead: (threadId: string) =>
    requestJson<{ success: boolean }>(`/inbox/threads/${threadId}/read`, {
      method: "POST"
    }),
  listNotifications: () =>
    requestJson<{ notifications: NotificationRecord[] }>("/inbox/notifications", {
      method: "GET"
    }),
  markNotificationRead: (notificationId: string) =>
    requestJson<{ success: boolean }>(`/inbox/notifications/${notificationId}/read`, {
      method: "POST"
    })
};

export const profileApi = {
  getFreelancerProfile: () =>
    requestJson<{ profile: FreelancerProfileRecord }>("/profile/freelancer", {
      method: "GET"
    }),
  updateFreelancerProfile: (input: UpdateFreelancerProfileInput) =>
    requestJson<{ profile: FreelancerProfileRecord }>("/profile/freelancer", {
      method: "PATCH",
      json: input
    }),
  uploadFreelancerResume: (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    return requestFormData<{ profile: FreelancerProfileRecord }>(
      "/profile/freelancer/resume",
      formData,
      {
        method: "POST"
      }
    );
  },
  downloadFreelancerResume: (freelancerId: string) =>
    requestBlob(`/profile/freelancers/${freelancerId}/resume`, {
      method: "GET"
    }),
  getCompanyProfile: () =>
    requestJson<{ profile: CompanyProfileRecord }>("/profile/company", {
      method: "GET"
    }),
  listPublicCompanies: () =>
    requestJson<{ companies: PublicCompanyProfileRecord[] }>("/profile/companies", {
      method: "GET"
    }),
  getPublicCompanyProfile: (companyId: string) =>
    requestJson<{ company: PublicCompanyProfileRecord }>(`/profile/companies/${companyId}`, {
      method: "GET"
    }),
  getPublicFreelancerProfile: (freelancerId: string) =>
    requestJson<{ profile: PublicFreelancerProfileRecord }>(`/profile/freelancers/${freelancerId}`, {
      method: "GET"
    }),
  updateCompanyProfile: (input: UpdateCompanyProfileInput) =>
    requestJson<{ profile: CompanyProfileRecord }>("/profile/company", {
      method: "PATCH",
      json: input
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
  downloadIncomeStatementPdf: (statementId: string) =>
    requestBlob(`/freelancer/income/statements/${statementId}/pdf`, {
      method: "GET"
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
