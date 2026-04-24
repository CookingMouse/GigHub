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

const getStatusColor = (status: string): { color: string; backgroundColor: string } => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === "accepted" || statusLower === "approved") {
    return { color: "#0F6E56", backgroundColor: "#E1F5EE" };
  }
  
  if (statusLower === "rejected" || statusLower === "denied") {
    return { color: "#DC2626", backgroundColor: "#FEF2F2" };
  }
  
  if (statusLower === "pending") {
    return { color: "#B45309", backgroundColor: "#FEF3C7" };
  }
  
  return { color: "#6B7280", backgroundColor: "#F3F4F6" };
};

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
      {state.status === "loading" ? (
        <p className="freelancer-requests-supporting-copy">Loading requests...</p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="workspace-grid freelancer-requests-layout">
          <section className="inline-panel">
            <p className="freelancer-requests-section-label">Your applications</p>
            <h2 className="freelancer-requests-section-title">Submitted requests</h2>
            <div className="card-stack">
              {state.applications.length === 0 ? (
                <p className="freelancer-requests-supporting-copy">
                  You have not applied to any jobs yet.
                </p>
              ) : (
                state.applications.map((application) => (
                  <article className="status-panel freelancer-requests-card" key={application.id}>
                    <strong className="freelancer-requests-card-title">{application.jobTitle}</strong>
                    <p className="freelancer-requests-card-meta">
                      Status:{" "}
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "12px",
                          ...getStatusColor(application.status)
                        }}
                      >
                        {toSentenceCase(application.status)}
                      </span>
                    </p>
                    <p className="freelancer-requests-supporting-copy">
                      Applied: {formatDate(application.appliedAt)}
                    </p>
                    <p className="freelancer-requests-supporting-copy">
                      Last updated: {formatDate(application.updatedAt)}
                    </p>
                    {application.coverNote ? (
                      <p className="freelancer-requests-card-body">{application.coverNote}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="inline-panel">
            <p className="freelancer-requests-section-label">Company invitations</p>
            <h2 className="freelancer-requests-section-title">Invitations from companies</h2>
            <div className="card-stack">
              {state.invitations.length === 0 ? (
                <p className="freelancer-requests-supporting-copy">No company requests yet.</p>
              ) : (
                state.invitations.map((invitation) => (
                  <article className="status-panel freelancer-requests-card" key={invitation.id}>
                    <strong className="freelancer-requests-card-title">{invitation.jobTitle}</strong>
                    <p className="freelancer-requests-card-meta">{invitation.companyName}</p>
                    <p className="freelancer-requests-card-body">{invitation.note ?? "No note."}</p>
                    <p className="freelancer-requests-card-meta">
                      Status:{" "}
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "12px",
                          ...getStatusColor(invitation.status)
                        }}
                      >
                        {toSentenceCase(invitation.status)}
                      </span>
                    </p>
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
