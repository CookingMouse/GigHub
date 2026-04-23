"use client";

import type {
  ApiErrorResponse,
  AssignFreelancerInput,
  FreelancerJobRecord,
  FreelancerDirectoryRecord,
  FreelancerMilestoneDetailRecord,
  JobRecord,
  LoginInput,
  MilestonePlanInput,
  MockPaymentIntentRecord,
  PublicUser,
  RegisterInput,
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
  }
};
