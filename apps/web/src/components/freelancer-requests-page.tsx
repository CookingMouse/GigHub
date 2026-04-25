"use client";

import type { JobApplicationRecord, JobInvitationRecord, JobMatchRecord } from "@gighub/shared";
import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi, requestsApi } from "@/lib/api";
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

type MatchesState =
  | { status: "loading" }
  | { status: "ready"; matches: JobMatchRecord[] }
  | { status: "error" };

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

export const FreelancerRequestsPage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<RequestsState>({ status: "loading" });
  const [matchesState, setMatchesState] = useState<MatchesState>({ status: "loading" });
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
    if (session.status !== "ready") return;

    void reload();

    void freelancerWorkspaceApi
      .listJobMatches()
      .then((res) => setMatchesState({ status: "ready", matches: res.matches }))
      .catch(() => setMatchesState({ status: "error" }));
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Left column: applications + invitations */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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

          {/* Right column: AI-recommended jobs */}
          <section className="inline-panel">
            <p className="freelancer-requests-section-label">AI-Powered Matches</p>
            <h2 className="freelancer-requests-section-title">Recommended for you</h2>

            {matchesState.status === "loading" ? (
              <p className="freelancer-requests-supporting-copy">Finding best matches…</p>
            ) : null}

            {matchesState.status === "error" ? (
              <p className="freelancer-requests-supporting-copy">Unable to load recommendations.</p>
            ) : null}

            {matchesState.status === "ready" ? (
              <div className="card-stack">
                {matchesState.matches.length === 0 ? (
                  <p className="freelancer-requests-supporting-copy">No recommendations yet. Complete your profile to get matched.</p>
                ) : (
                  matchesState.matches.map((match) => (
                    <article className="status-panel freelancer-requests-card" key={match.jobId}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <strong className="freelancer-requests-card-title">{match.title}</strong>
                        <span style={{
                          flexShrink: 0,
                          fontSize: 12, fontWeight: 700,
                          color: "#0F6E56", backgroundColor: "#E1F5EE",
                          padding: "3px 10px", borderRadius: 99
                        }}>
                          {match.matchScore}% match
                        </span>
                      </div>
                      <p className="freelancer-requests-card-meta">{match.companyName}</p>
                      <p className="freelancer-requests-card-meta" style={{ color: "#1D4ED8", fontWeight: 600 }}>
                        {formatCurrency(match.budget)}
                      </p>
                      {match.requiredSkills.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {match.requiredSkills.slice(0, 4).map((skill) => (
                            <span key={skill} style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 99,
                              background: "#EFF6FF", color: "#1D4ED8", fontWeight: 500
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {match.reasons.length > 0 ? (
                        <p className="freelancer-requests-supporting-copy" style={{ marginTop: 8 }}>
                          {match.reasons[0]}
                        </p>
                      ) : null}
                      <div className="action-row" style={{ marginTop: 12 }}>
                        <Link className="button-primary" href={`/freelancer/requests/${match.jobId}`}
                          style={{ fontSize: 12, padding: "6px 14px" }}>
                          View Details
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
