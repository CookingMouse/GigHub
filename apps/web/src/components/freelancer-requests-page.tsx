"use client";

import type { JobApplicationRecord, JobAvailabilityRecord, JobInvitationRecord } from "@gighub/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, healthApi, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type RequestsState =
  | { status: "loading" }
  | {
      status: "ready";
      jobs: JobAvailabilityRecord[];
      applications: JobApplicationRecord[];
      invitations: JobInvitationRecord[];
    }
  | { status: "error"; message: string };

export const FreelancerRequestsPage = () => {
  const session = useProtectedUser("freelancer");
  const searchParams = useSearchParams();
  const highlightedJobId = searchParams.get("jobId");
  const [state, setState] = useState<RequestsState>({ status: "loading" });
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [actionInvitationId, setActionInvitationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const routeStatus = await healthApi.routes();

      if (!routeStatus.routes.requests) {
        setState({
          status: "error",
          message: "Request routes are unavailable in the running API process. Restart API and retry."
        });
        return;
      }

      const [availability, requests] = await Promise.all([
        requestsApi.listAvailability(),
        requestsApi.listFreelancerRequests()
      ]);

      setState({
        status: "ready",
        jobs: availability.jobs,
        applications: requests.applications,
        invitations: requests.invitations
      });
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        setState({
          status: "error",
          message:
            "The running API process does not include the new request routes yet. Restart API (npm run dev) and retry."
        });
        return;
      }

      setState({
        status: "error",
        message: loadError instanceof ApiRequestError ? loadError.message : "Unable to load job requests."
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

  const handleApply = (jobId: string) => {
    setError(null);
    setApplyingJobId(jobId);
    startTransition(async () => {
      try {
        await requestsApi.applyToJob(jobId, { coverNote: "" });
        await reload();
      } catch (applyError) {
        setError(applyError instanceof ApiRequestError ? applyError.message : "Unable to apply.");
      } finally {
        setApplyingJobId(null);
      }
    });
  };

  const handleInviteAction = (invitationId: string, action: "accept" | "reject") => {
    setError(null);
    setActionInvitationId(invitationId);
    startTransition(async () => {
      try {
        await requestsApi.respondInvitation(invitationId, { action });
        await reload();
      } catch (inviteError) {
        setError(inviteError instanceof ApiRequestError ? inviteError.message : "Unable to respond.");
      } finally {
        setActionInvitationId(null);
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Job Request"
      subtitle="Self request on open jobs, and handle company requests in one place."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {state.status === "loading" ? <p className="muted">Loading requests...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <p className="eyebrow">Self request</p>
            <h2>Open jobs you can apply for</h2>
            <div className="card-stack">
              {state.jobs.map((job) => {
                const applied = state.applications.find((item) => item.jobId === job.id);
                return (
                  <article
                    className="status-panel"
                    key={job.id}
                    style={highlightedJobId === job.id ? { borderColor: "rgba(11,110,79,0.4)" } : undefined}
                  >
                    <strong>{job.title}</strong>
                    <p>{job.companyName}</p>
                    <p className="muted">Budget: {job.budget}</p>
                    {applied ? <p className="helper-copy">Application status: {applied.status}</p> : null}
                    <button
                      className="button-primary"
                      disabled={applyingJobId !== null || Boolean(applied && applied.status === "PENDING")}
                      onClick={() => handleApply(job.id)}
                      type="button"
                    >
                      {applyingJobId === job.id ? "Applying..." : applied ? "Re-apply" : "Apply"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Company request</p>
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
                    <p className="muted">Status: {invitation.status}</p>
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
