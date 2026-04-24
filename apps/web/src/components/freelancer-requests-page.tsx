"use client";

import type { JobApplicationRecord, JobInvitationRecord } from "@gighub/shared";
import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type RequestsState =
  | { status: "loading" }
  | {
      status: "ready";
      applications: JobApplicationRecord[];
      invitations: JobInvitationRecord[];
    }
  | { status: "error"; message: string };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));

const toSentenceCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatRequestError = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "The running API process does not include the request routes yet. Restart API (npm run dev) and retry.";
  }

  return error instanceof ApiRequestError ? error.message : fallback;
};

export const FreelancerRequestsPage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<RequestsState>({ status: "loading" });
  const [actionInvitationId, setActionInvitationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const requests = await requestsApi.listFreelancerRequests();

      setState({
        status: "ready",
        applications: requests.applications,
        invitations: requests.invitations
      });
    } catch (loadError) {
      setState({
        status: "error",
        message: formatRequestError(loadError, "Unable to load job requests.")
      });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void reload();
    }
  }, [session.status]);

  if (session.status !== "ready") {
    return null;
  }

  const handleInviteAction = (invitationId: string, action: "accept" | "reject") => {
    setError(null);
    setActionInvitationId(invitationId);
    startTransition(async () => {
      try {
        await requestsApi.respondInvitation(invitationId, { action });
        await reload();
      } catch (inviteError) {
        setError(formatRequestError(inviteError, "Unable to respond."));
      } finally {
        setActionInvitationId(null);
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Job Request"
      subtitle="Track your submitted applications and respond to company invitations."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {state.status === "loading" ? <p className="muted">Loading requests...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <p className="eyebrow">Your applications</p>
            <h2>Submitted requests</h2>
            <div className="card-stack">
              {state.applications.length === 0 ? (
                <p className="muted">You have not applied to any jobs yet.</p>
              ) : (
                state.applications.map((application) => (
                  <article className="status-panel" key={application.id}>
                    <strong>{application.jobTitle}</strong>
                    <p className="muted">Status: {toSentenceCase(application.status)}</p>
                    <p className="helper-copy">Applied: {formatDate(application.appliedAt)}</p>
                    <p className="helper-copy">Last updated: {formatDate(application.updatedAt)}</p>
                    {application.coverNote ? <p className="muted">{application.coverNote}</p> : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Company invitations</p>
            <h2>Invitations from companies</h2>
            <div className="card-stack">
              {state.invitations.length === 0 ? (
                <p className="muted">No company requests yet.</p>
              ) : (
                state.invitations.map((invitation) => (
                  <article className="status-panel" key={invitation.id}>
                    <strong>{invitation.jobTitle}</strong>
                    <p>{invitation.companyName}</p>
                    <p className="muted">{invitation.note ?? "No note."}</p>
                    <p className="muted">Status: {toSentenceCase(invitation.status)}</p>
                    <div className="action-row">
                      <Link className="button-secondary" href={`/companies/${invitation.companyId}`}>
                        View company page
                      </Link>
                      {invitation.status === "PENDING" ? (
                        <>
                          <button
                            className="button-primary"
                            disabled={actionInvitationId !== null}
                            onClick={() => handleInviteAction(invitation.id, "accept")}
                            type="button"
                          >
                            {actionInvitationId === invitation.id ? "Working..." : "Accept"}
                          </button>
                          <button
                            className="button-secondary"
                            disabled={actionInvitationId !== null}
                            onClick={() => handleInviteAction(invitation.id, "reject")}
                            type="button"
                          >
                            Deny
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
