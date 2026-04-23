"use client";

import type { AdminDisputeDetailRecord } from "@gighub/shared";
import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { adminApi, ApiRequestError } from "@/lib/api";
import { LogoutButton } from "./logout-button";

type AdminDisputeDetailPageProps = {
  disputeId: string;
};

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; dispute: AdminDisputeDetailRecord };

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const AdminDisputeDetailPage = ({ disputeId }: AdminDisputeDetailPageProps) => {
  const session = useProtectedUser("admin");
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<"release_funds" | "request_revision" | null>(null);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadDispute = async () => {
      try {
        const response = await adminApi.getDispute(disputeId);

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          dispute: response.dispute
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
              : "Unable to load the dispute detail right now."
        });
      }
    };

    void loadDispute();

    return () => {
      isMounted = false;
    };
  }, [disputeId, session.status]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Checking your admin session</h1>
        <p className="muted">Restoring moderation permissions.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Session unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/login">
          Back to login
        </Link>
      </section>
    );
  }

  const handleResolve = (outcome: "release_funds" | "request_revision") => {
    const trimmedSummary = resolutionSummary.trim();

    if (trimmedSummary.length < 12) {
      setResolutionError("Add a clear moderator summary before resolving the dispute.");
      return;
    }

    setResolutionError(null);
    setIsResolving(outcome);

    startTransition(async () => {
      try {
        const response = await adminApi.resolveDispute(disputeId, {
          outcome,
          resolutionSummary: trimmedSummary,
          adminNote: adminNote.trim()
        });

        setState({
          status: "ready",
          dispute: response.dispute
        });
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setResolutionError(error.message);
        } else {
          setResolutionError("Unable to resolve the dispute right now.");
        }
      } finally {
        setIsResolving(null);
      }
    });
  };

  if (state.status === "loading") {
    return (
      <section className="shell-card">
        <div className="shell-header">
          <div>
            <p className="eyebrow">GigHub</p>
            <h1>Loading dispute</h1>
          </div>
          <LogoutButton />
        </div>
        <p className="muted">Pulling the submission and moderation context.</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="shell-card">
        <div className="shell-header">
          <div>
            <p className="eyebrow">GigHub</p>
            <h1>Dispute unavailable</h1>
          </div>
          <LogoutButton />
        </div>
        <p className="form-error">{state.message}</p>
        <div className="action-row">
          <Link className="button-secondary" href="/admin">
            Back to dispute queue
          </Link>
        </div>
      </section>
    );
  }

  const { dispute } = state;
  const canResolve = dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";

  return (
    <section className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub</p>
          <h1>{dispute.job.title}</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="action-row">
        <Link className="button-secondary" href="/admin">
          Back to dispute queue
        </Link>
      </div>

      <div className="status-grid">
        <article className="status-panel">
          <span className="panel-label">Dispute status</span>
          <strong>{dispute.status}</strong>
          <p>Opened {formatDate(dispute.openedAt)}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Parties</span>
          <strong>{dispute.job.companyName}</strong>
          <p>{dispute.job.freelancerName}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Milestone</span>
          <strong>{dispute.milestone.title}</strong>
          <p>{dispute.milestone.status}</p>
        </article>
      </div>

      <section className="inline-panel">
        <p className="eyebrow">Client rejection</p>
        <h2>Why the company rejected the milestone</h2>
        <p>{dispute.rejectionReason}</p>
        {dispute.resolutionSummary ? (
          <p className="helper-copy">Resolution summary: {dispute.resolutionSummary}</p>
        ) : null}
        {dispute.adminNote ? <p className="helper-copy">Admin note: {dispute.adminNote}</p> : null}
      </section>

      <div className="workspace-grid">
        <section className="inline-panel">
          <p className="eyebrow">Submission</p>
          <h2>Latest freelancer delivery</h2>

          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">File</span>
              <strong>{dispute.submission.fileName ?? "Unknown file"}</strong>
              <p>
                {dispute.submission.fileFormat?.toUpperCase() ?? "Unknown"} · Revision{" "}
                {dispute.submission.revision}
              </p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Submitted</span>
              <strong>{formatDate(dispute.submission.submittedAt)}</strong>
              <p>{dispute.submission.fileSizeBytes?.toLocaleString() ?? "Unknown"} bytes</p>
            </article>
          </div>

          {dispute.submission.notes ? <p className="muted">{dispute.submission.notes}</p> : null}
        </section>

        <section className="inline-panel">
          <p className="eyebrow">Milestone</p>
          <h2>Review timeline</h2>
          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">Review due</span>
              <strong>{formatDate(dispute.milestone.reviewDueAt)}</strong>
              <p>Release paths stay locked to one protected service.</p>
            </article>
          </div>
        </section>
      </div>

      <section className="inline-panel">
        <p className="eyebrow">Moderator action</p>
        <h2>Close the dispute</h2>

        {resolutionError ? <p className="form-error">{resolutionError}</p> : null}

        <label className="field" htmlFor="resolution-summary">
          <span>Resolution summary</span>
          <textarea
            disabled={!canResolve || isResolving !== null}
            id="resolution-summary"
            onChange={(event) => setResolutionSummary(event.target.value)}
            placeholder="Summarize the evidence used to release funds or request another revision."
            value={resolutionSummary}
          />
        </label>

        <label className="field" htmlFor="admin-note">
          <span>Admin note</span>
          <textarea
            disabled={!canResolve || isResolving !== null}
            id="admin-note"
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Optional moderator note for the audit trail."
            value={adminNote}
          />
        </label>

        <div className="action-row">
          <button
            className="button-primary"
            disabled={!canResolve || isResolving !== null}
            onClick={() => handleResolve("release_funds")}
            type="button"
          >
            {isResolving === "release_funds" ? "Releasing..." : "Release funds"}
          </button>
          <button
            className="button-secondary"
            disabled={!canResolve || isResolving !== null}
            onClick={() => handleResolve("request_revision")}
            type="button"
          >
            {isResolving === "request_revision" ? "Routing revision..." : "Request revision"}
          </button>
        </div>

        {!canResolve ? (
          <p className="helper-copy">This dispute is already resolved and kept here for traceability.</p>
        ) : null}
      </section>
    </section>
  );
};
