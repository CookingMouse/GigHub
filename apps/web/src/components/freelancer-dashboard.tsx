"use client";

import type { FreelancerJobRecord, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { FreelancerWorkspaceShell } from "./freelancer-workspace-shell";

type FreelancerDashboardProps = {
  user: PublicUser;
};

type JobsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: FreelancerJobRecord[] };

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

    const loadJobs = async () => {
      try {
        const response = await freelancerWorkspaceApi.listJobs();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          jobs: response.jobs
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
              : "Unable to load the assigned milestones right now."
        });
      }
    };

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FreelancerWorkspaceShell
      description="Track assigned milestones, upload confidential submissions, and keep every revision inside the protected workflow."
      freelancerEmail={user.email}
      freelancerName={user.name}
      title="Freelancer dashboard"
    >
      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading assigned work</h2>
          <p className="muted">Pulling the jobs and milestone status from the freelancer workspace.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Workspace unavailable</h2>
          <p className="form-error">{state.message}</p>
        </section>
      ) : null}

      {state.status === "ready" && state.jobs.length === 0 ? (
        <section className="inline-panel">
          <h2>No assigned jobs yet</h2>
          <p className="muted">
            When a company assigns a funded project to this freelancer account, it will appear here
            with its milestone submission links.
          </p>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <div className="card-stack">
          {state.jobs.map((job) => (
            <section className="list-card" key={job.id}>
              <div className="list-card-header">
                <div>
                  <p className="eyebrow">Assigned job</p>
                  <h2>{job.title}</h2>
                  <p className="muted">
                    {job.companyName} · {job.status}
                  </p>
                </div>
              </div>

              <div className="directory-grid">
                {job.milestones.map((milestone) => (
                  <article className="directory-card" key={milestone.id}>
                    <p className="eyebrow">Milestone {milestone.sequence}</p>
                    <h3>{milestone.title}</h3>
                    <p className="muted">{milestone.description || "No description added yet."}</p>
                    <p className="muted">Due: {formatDate(milestone.dueAt)}</p>
                    <p className="muted">
                      {milestone.revisionCount} / 3 revisions used · {milestone.status}
                    </p>
                    <Link
                      className="button-primary"
                      href={`/freelancer/milestones/${milestone.id}`}
                    >
                      Open milestone
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </FreelancerWorkspaceShell>
  );
};
