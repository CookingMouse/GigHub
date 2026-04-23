"use client";

import type { FreelancerJobRecord, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi, requestsApi } from "@/lib/api";
import { FreelancerWorkspaceShell } from "./freelancer-workspace-shell";

type FreelancerDashboardProps = {
  user: PublicUser;
};

type JobsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      jobs: FreelancerJobRecord[];
      recommendedJobs: Awaited<ReturnType<typeof requestsApi.listAvailability>>["jobs"];
    };

const formatDate = (value: string | null) => {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));
};

export const FreelancerDashboard = ({ user }: FreelancerDashboardProps) => {
  const [state, setState] = useState<JobsState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [jobsResponse, recommendedResponse] = await Promise.all([
          freelancerWorkspaceApi.listJobs(),
          requestsApi.listAvailability()
        ]);

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          jobs: jobsResponse.jobs,
          recommendedJobs: recommendedResponse.jobs.slice(0, 8)
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
              : "Unable to load your dashboard right now."
        });
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FreelancerWorkspaceShell
      description="View recommended jobs, your current working task list, and working schedule."
      freelancerEmail={user.email}
      freelancerName={user.name}
      title="Freelancer dashboard"
    >
      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading dashboard</h2>
          <p className="muted">Pulling recommendations and current task data.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Dashboard unavailable</h2>
          <p className="form-error">{state.message}</p>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <p className="eyebrow">Job recommended currently</p>
            <h2>Recommended jobs</h2>
            <div className="card-stack">
              {state.recommendedJobs.length === 0 ? (
                <p className="muted">No recommendations yet. Check Job Request for all open jobs.</p>
              ) : (
                state.recommendedJobs.map((job) => (
                  <article className="status-panel" key={job.id}>
                    <strong>{job.title}</strong>
                    <p className="muted">{job.companyName}</p>
                    <p className="muted">Budget: {job.budget}</p>
                    <Link className="button-primary" href={`/freelancer/requests?jobId=${job.id}`}>
                      Open in Job Request
                    </Link>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Current working task list</p>
            <h2>Active milestones</h2>
            <div className="card-stack">
              {state.jobs.length === 0 ? (
                <p className="muted">No active jobs assigned yet.</p>
              ) : (
                state.jobs.flatMap((job) =>
                  job.milestones.map((milestone) => (
                    <article className="status-panel" key={milestone.id}>
                      <strong>{milestone.title}</strong>
                      <p>{job.title}</p>
                      <p className="muted">Status: {milestone.status}</p>
                      <Link className="button-secondary" href={`/freelancer/milestones/${milestone.id}`}>
                        Open milestone
                      </Link>
                    </article>
                  ))
                )
              )}
            </div>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Working schedule</p>
            <h2>Upcoming due dates</h2>
            <div className="card-stack">
              {state.jobs.length === 0 ? (
                <p className="muted">No schedule items yet.</p>
              ) : (
                state.jobs.flatMap((job) =>
                  job.milestones.map((milestone) => (
                    <article className="status-panel" key={`${milestone.id}-schedule`}>
                      <strong>{milestone.title}</strong>
                      <p className="muted">{job.title}</p>
                      <p>Due: {formatDate(milestone.dueAt)}</p>
                    </article>
                  ))
                )
              )}
            </div>
          </section>
        </div>
      ) : null}
    </FreelancerWorkspaceShell>
  );
};
