"use client";

import type { JobRecord } from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { CompanyWorkspaceShell } from "./company-workspace-shell";

type JobsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: JobRecord[] };

type JobFilter = "ALL" | "DRAFT" | "OPEN" | "ACTIVE" | "COMPLETED";

const hiringAccent = "#1D4ED8";

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
    dateStyle: "medium"
  }).format(new Date(value));
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT": return "#6B7280";
    case "OPEN": return hiringAccent;
    case "ASSIGNED":
    case "ESCROW_FUNDED":
    case "IN_PROGRESS": return "#0F6E56";
    case "COMPLETED": return "#0F6E56";
    case "DISPUTED": return "#DC2626";
    default: return "#6B7280";
  }
};

const toSentenceCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const CompanyJobsPage = () => {
  const session = useProtectedUser("company");
  const [state, setState] = useState<JobsState>({ status: "loading" });
  const [filter, setFilter] = useState<JobFilter>("ALL");

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

  const filteredJobs = useMemo(() => {
    if (state.status !== "ready") return [];
    
    switch (filter) {
      case "DRAFT": return state.jobs.filter(j => j.status === "DRAFT");
      case "OPEN": return state.jobs.filter(j => j.status === "OPEN");
      case "ACTIVE": return state.jobs.filter(j => ["ASSIGNED", "ESCROW_FUNDED", "IN_PROGRESS", "DISPUTED"].includes(j.status));
      case "COMPLETED": return state.jobs.filter(j => j.status === "COMPLETED");
      default: return state.jobs;
    }
  }, [state, filter]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Restoring your hiring dashboard and job drafts.</p>
      </section>
    );
  }

  return (
    <CompanyWorkspaceShell
      actions={
        <>
          <Link className="button-primary" href="/jobs/new">
            New job draft
          </Link>
          <Link className="button-secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </>
      }
      companyEmail={session.user.email}
      companyName={session.user.name}
      description="View and manage all your job listings, from drafts to completed projects."
      title="Job History"
    >
      <div className="company-dashboard-surface" style={{ marginBottom: 24, padding: "8px 12px" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
          {(["ALL", "DRAFT", "OPEN", "ACTIVE", "COMPLETED"] as JobFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: filter === f ? hiringAccent : "transparent",
                color: filter === f ? "#fff" : "#6B7280",
                whiteSpace: "nowrap"
              }}
            >
              {toSentenceCase(f)}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <p className="muted">Fetching your job history...</p>
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Jobs unavailable</h2>
          <p className="muted">{state.message}</p>
        </section>
      ) : null}

      {state.status === "ready" && filteredJobs.length === 0 ? (
        <section className="inline-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2>No jobs found</h2>
          <p className="muted">
            {filter === "ALL" 
              ? "You haven't created any jobs yet." 
              : `You don't have any jobs in the ${filter.toLowerCase()} stage.`}
          </p>
          {filter === "ALL" && (
            <div className="action-row" style={{ justifyContent: "center" }}>
              <Link className="button-primary" href="/jobs/new">Create your first job</Link>
            </div>
          )}
        </section>
      ) : null}

      {state.status === "ready" && filteredJobs.length > 0 ? (
        <div className="card-stack">
          {filteredJobs.map((job) => (
            <article className="list-card" key={job.id} style={{ borderLeft: `4px solid ${getStatusColor(job.status)}` }}>
              <div className="list-card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span
                      className="company-dashboard-badge"
                      style={{
                        backgroundColor: `${getStatusColor(job.status)}15`,
                        color: getStatusColor(job.status)
                      }}
                    >
                      {toSentenceCase(job.status)}
                    </span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>Created {formatDate(job.createdAt)}</span>
                  </div>
                  <h2 style={{ margin: 0 }}>{job.title}</h2>
                  {job.assignedFreelancer && (
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "#4B5563" }}>
                      Freelancer: <strong>{job.assignedFreelancer.displayName}</strong>
                    </p>
                  )}
                </div>
                <Link className="button-secondary" href={`/jobs/${job.id}`}>
                  Manage Job
                </Link>
              </div>

              <div className="status-grid compact-grid">
                <article className="status-panel">
                  <span className="panel-label">Budget</span>
                  <strong>{formatCurrency(Number(job.budget))}</strong>
                  <p>{job.milestoneCount} milestone(s)</p>
                </article>

                <article className="status-panel">
                  <span className="panel-label">Validation</span>
                  <strong>
                    {job.brief.validation.score === null
                      ? "Pending"
                      : `${job.brief.validation.score}/100`}
                  </strong>
                  <p>
                    {job.brief.validation.isStale
                      ? "Requires re-validation"
                      : "Fresh brief"}
                  </p>
                </article>

                <article className="status-panel">
                  <span className="panel-label">Activity</span>
                  <strong>{job.status === "DRAFT" ? "N/A" : formatDate(job.publishedAt || job.assignedAt)}</strong>
                  <p>{job.status === "DRAFT" ? "Drafting phase" : "Last status update"}</p>
                </article>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </CompanyWorkspaceShell>
  );
};
