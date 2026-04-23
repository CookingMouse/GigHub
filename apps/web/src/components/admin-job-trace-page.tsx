"use client";

import type { AdminJobTraceRecord } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { LogoutButton } from "./logout-button";

type AdminJobTracePageProps = {
  jobId: string;
};

type TraceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trace: AdminJobTraceRecord };

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const AdminJobTracePage = ({ jobId }: AdminJobTracePageProps) => {
  const session = useProtectedUser("admin");
  const [state, setState] = useState<TraceState>({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadTrace = async () => {
      try {
        const response = await adminApi.getJobTrace(jobId);

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          trace: response.trace
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof ApiRequestError
              ? error.message
              : "Unable to load the job trace right now."
        });
      }
    };

    void loadTrace();

    return () => {
      isMounted = false;
    };
  }, [jobId, session.status]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Checking admin session</h1>
        <p className="muted">Restoring trace permissions.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Trace unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/login">
          Back to login
        </Link>
      </section>
    );
  }

  return (
    <section className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub</p>
          <h1>Job trace</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="action-row">
        <Link className="button-secondary" href="/admin/audit">
          Back to audit
        </Link>
      </div>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading trace</h2>
          <p className="muted">Collecting job, milestone, GLM, escrow, and audit events.</p>
        </section>
      ) : null}

      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <>
          <section className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">Trace source</p>
                <h2>{state.trace.title}</h2>
              </div>
              <span className="status-chip">{state.trace.status}</span>
            </div>

            <div className="status-grid compact-grid">
              <article className="status-panel">
                <span className="panel-label">Company</span>
                <strong>{state.trace.companyName}</strong>
                <p>Freelancer: {state.trace.freelancerName ?? "Unassigned"}</p>
              </article>

              <article className="status-panel">
                <span className="panel-label">Escrow</span>
                <strong>{state.trace.escrow?.status ?? "None"}</strong>
                <p>
                  Released: {formatCurrency(state.trace.escrow?.releasedAmount ?? 0)} /{" "}
                  {formatCurrency(state.trace.escrow?.fundedAmount ?? 0)}
                </p>
              </article>
            </div>
          </section>

          <div className="workspace-grid">
            <section className="inline-panel">
              <p className="eyebrow">Milestones</p>
              <h2>Delivery timeline</h2>

              <div className="card-stack">
                {state.trace.milestones.map((milestone) => (
                  <article className="status-panel" key={milestone.id}>
                    <span className="panel-label">Milestone {milestone.sequence}</span>
                    <strong>{milestone.title}</strong>
                    <p>
                      {milestone.status} · {formatCurrency(milestone.amount)} · released{" "}
                      {formatDate(milestone.releasedAt)}
                    </p>
                    {milestone.latestDecision ? (
                      <p className="muted">
                        GLM: {milestone.latestDecision.passFail ?? "decision"} at{" "}
                        {milestone.latestDecision.overallScore ?? "N/A"}/100
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="inline-panel">
              <p className="eyebrow">Audit events</p>
              <h2>Decision trail</h2>

              {state.trace.auditLogs.length === 0 ? (
                <p className="muted">No audit logs are attached to this job trace yet.</p>
              ) : (
                <div className="card-stack">
                  {state.trace.auditLogs.map((auditLog) => (
                    <article className="status-panel" key={auditLog.id}>
                      <span className="panel-label">{auditLog.eventType}</span>
                      <strong>{auditLog.entityType}</strong>
                      <p>
                        {auditLog.actorName ?? "System"} · {formatDate(auditLog.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
};
