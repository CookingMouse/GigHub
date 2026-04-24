"use client";

import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, freelancersApi, jobsApi, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      applications: Awaited<ReturnType<typeof requestsApi.listCompanyRequests>>["applications"];
      invitations: Awaited<ReturnType<typeof requestsApi.listCompanyRequests>>["invitations"];
      jobs: Awaited<ReturnType<typeof jobsApi.list>>["jobs"];
      freelancers: Awaited<ReturnType<typeof freelancersApi.list>>["freelancers"];
    }
  | { status: "error"; message: string };

export const CompanyRequestsPage = () => {
  const session = useProtectedUser("company");
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [requests, jobs, freelancers] = await Promise.all([
        requestsApi.listCompanyRequests(),
        jobsApi.list(),
        freelancersApi.list()
      ]);

      setState({
        status: "ready",
        applications: requests.applications,
        invitations: requests.invitations,
        jobs: jobs.jobs,
        freelancers: freelancers.freelancers
      });
    } catch (loadError) {
      setState({
        status: "error",
        message: loadError instanceof ApiRequestError ? loadError.message : "Unable to load requests."
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

  const invite = (jobId: string, freelancerId: string) => {
    setBusyId(`${jobId}-${freelancerId}`);
    setError(null);
    startTransition(async () => {
      try {
        await requestsApi.inviteFreelancer(jobId, { freelancerId, note: "" });
        await reload();
      } catch (inviteError) {
        setError(inviteError instanceof ApiRequestError ? inviteError.message : "Unable to invite.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const resolveApplication = (applicationId: string, action: "accept" | "reject") => {
    setBusyId(applicationId);
    setError(null);
    startTransition(async () => {
      try {
        await requestsApi.resolveApplication(applicationId, action);
        await reload();
      } catch (resolveError) {
        setError(resolveError instanceof ApiRequestError ? resolveError.message : "Unable to resolve.");
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Requests"
      subtitle="Review freelancer applications and invite talent to your open roles."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {state.status === "loading" ? <p className="muted">Loading requests...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <p className="eyebrow">Talent Pipeline</p>
            <h2>Freelancer Applications</h2>
            <div className="card-stack">
              {state.applications.map((application) => (
                <article className="status-panel" key={application.id}>
                  <strong>{application.freelancerDisplayName}</strong>
                  <p>{application.freelancerEmail}</p>
                  <p className="muted">Status: {application.status}</p>
                  {application.status === "PENDING" ? (
                    <div className="action-row">
                      <button
                        className="button-primary"
                        disabled={busyId !== null}
                        onClick={() => resolveApplication(application.id, "accept")}
                        type="button"
                      >
                        {busyId === application.id ? "Working..." : "Accept"}
                      </button>
                      <button
                        className="button-secondary"
                        disabled={busyId !== null}
                        onClick={() => resolveApplication(application.id, "reject")}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Company request</p>
            <h2>Invite freelancer</h2>
            <div className="card-stack">
              {state.jobs
                .filter((job) => job.status === "OPEN")
                .slice(0, 3)
                .map((job) => (
                  <article className="status-panel" key={job.id}>
                    <strong>{job.title}</strong>
                    <div className="action-row">
                      {state.freelancers.slice(0, 3).map((freelancer) => (
                        <button
                          className="button-secondary"
                          disabled={busyId !== null}
                          key={freelancer.id}
                          onClick={() => invite(job.id, freelancer.id)}
                          type="button"
                        >
                          {busyId === `${job.id}-${freelancer.id}`
                            ? "Inviting..."
                            : `Invite ${freelancer.displayName}`}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Sent invitations</p>
            <h2>Tracking</h2>
            <div className="card-stack">
              {state.invitations.map((invitation) => (
                <article className="status-panel" key={invitation.id}>
                  <strong>{invitation.jobTitle}</strong>
                  <p>{invitation.freelancerName}</p>
                  <p className="muted">Status: {invitation.status}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
