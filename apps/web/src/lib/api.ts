"use client";

import type { ApiErrorResponse, LoginInput, PublicUser, RegisterInput } from "@gighub/shared";
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

