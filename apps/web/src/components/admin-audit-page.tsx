"use client";

import type { AdminAuditLogRecord, AdminIncomeStatementRecord } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { LogoutButton } from "./logout-button";

type AuditState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      auditLogs: AdminAuditLogRecord[];
      incomeStatements: AdminIncomeStatementRecord[];
    };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const AdminAuditPage = () => {
  const session = useProtectedUser("admin");
  const [state, setState] = useState<AuditState>({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadAudit = async () => {
      try {
        const response = await adminApi.getAudit();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          auditLogs: response.auditLogs,
          incomeStatements: response.incomeStatements
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
              : "Unable to load audit records right now."
        });
      }
    };

    void loadAudit();

    return () => {
      isMounted = false;
    };
  }, [session.status]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Checking admin session</h1>
        <p className="muted">Restoring audit permissions.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Audit unavailable</h1>
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
          <h1>Audit and verification</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="action-row">
        <Link className="button-secondary" href="/admin">
          Dispute queue
        </Link>
      </div>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading audit trail</h2>
          <p className="muted">Pulling decision, payout, and verification events.</p>
        </section>
      ) : null}

      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <p className="eyebrow">Audit browser</p>
            <h2>Recent platform events</h2>

            {state.auditLogs.length === 0 ? (
              <p className="muted">No audit events have been recorded yet.</p>
            ) : (
              <div className="card-stack">
                {state.auditLogs.slice(0, 20).map((auditLog) => (
                  <article className="status-panel" key={auditLog.id}>
                    <span className="panel-label">{auditLog.eventType}</span>
                    <strong>{auditLog.entityType}</strong>
                    <p>
                      {auditLog.actorName ?? "System"} · {formatDate(auditLog.createdAt)}
                    </p>
                    <p className="muted">
                      Entity: <code>{auditLog.entityId}</code>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Income verification</p>
            <h2>Generated statements</h2>

            {state.incomeStatements.length === 0 ? (
              <p className="muted">No income statements have been generated yet.</p>
            ) : (
              <div className="card-stack">
                {state.incomeStatements.map((statement) => (
                  <article className="status-panel" key={statement.id}>
                    <span className="panel-label">{statement.status}</span>
                    <strong>{statement.freelancerName}</strong>
                    <p>
                      {formatCurrency(statement.totalEarned)} · {statement.totalMilestones} milestone(s)
                    </p>
                    <p className="muted">
                      {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                    </p>
                    <p className="muted">
                      Verify token: <code>{statement.verifyToken}</code>
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
};
