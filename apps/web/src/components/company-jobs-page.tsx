"use client";

import type { JobRecord } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { CompanyWorkspaceShell } from "./company-workspace-shell";

type JobsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: JobRecord[] };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const CompanyJobsPage = () => {
  const session = useProtectedUser("company");
  const [state, setState] = useState<JobsState>({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadJobs = async () => {
      try {
        const response = await jobsApi.list();

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
            error instanceof ApiRequestError ? error.message : "Unable to load company jobs."
        });
      }
    };

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [session.status]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Restoring your hiring dashboard and job drafts.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Workspace unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  }

  return (
    <CompanyWorkspaceShell
      actions={
        <>
          <Link className="button-primary" href="/jobs/new">
            New draft
          </Link>
          <Link className="button-secondary" href="/dashboard">
            Dashboard overview
          </Link>
        </>
      }
      companyEmail={session.user.email}
      companyName={session.user.name}
      description="Manage structured briefs, rerun validation after edits, and publish only when the brief is fresh and specific."
      title="Job drafts"
    >
      {state.status === "loading" ? (
        <section className="inline-panel">
          <h2>Loading jobs</h2>
          <p className="muted">Fetching your existing drafts and published roles.</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Jobs unavailable</h2>
          <p className="muted">{state.message}</p>
        </section>
      ) : null}

      {state.status === "ready" && state.jobs.length === 0 ? (
        <section className="inline-panel">
          <h2>No jobs yet</h2>
          <p className="muted">
            Create your first structured brief, validate it, and publish it once the score clears
            the threshold.
          </p>
        </section>
      ) : null}

      {state.status === "ready" && state.jobs.length > 0 ? (
        <div className="card-stack">
          {state.jobs.map((job) => (
            <article className="list-card" key={job.id}>
              <div className="list-card-header">
                <div>
                  <p className="eyebrow">Status: {job.status}</p>
                  <h2>{job.title}</h2>
                </div>
                <Link className="button-secondary" href={`/jobs/${job.id}`}>
                  View job
                </Link>
              </div>

              <div className="status-grid compact-grid">
                <article className="status-panel">
                  <span className="panel-label">Budget</span>
                  <strong>{formatCurrency(job.budget)}</strong>
                  <p>{job.milestoneCount} milestone(s)</p>
                </article>

                <article className="status-panel">
                  <span className="panel-label">Validation</span>
                  <strong>
                    {job.brief.validation.score === null
                      ? "Not validated"
                      : `${job.brief.validation.score}/100`}
                  </strong>
                  <p>
                    {job.brief.validation.isStale
                      ? "Outdated after recent edits"
                      : "Fresh and ready for publish checks"}
                  </p>
                </article>

                <article className="status-panel">
                  <span className="panel-label">Last validated</span>
                  <strong>{formatDate(job.brief.validation.lastValidatedAt)}</strong>
                  <p>Published: {formatDate(job.publishedAt)}</p>
                </article>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </CompanyWorkspaceShell>
  );
};
