"use client";

import type { JobRecord, JobStatus } from "@gighub/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import { WorkspaceLayout } from "./workspace-layout";

type JobsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: JobRecord[] };

type FilterStatus = "ALL" | "DRAFT" | "ACTIVE" | "COMPLETED";

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

const getJobStatusLabel = (status: JobStatus) => {
  return status.replace(/_/g, " ");
};

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case "DRAFT": return "#6B7280";
    case "OPEN": return hiringAccent;
    case "ASSIGNED":
    case "ESCROW_FUNDED":
    case "IN_PROGRESS": return "#0F6E56";
    case "COMPLETED": return "#059669";
    case "DISPUTED": return "#DC2626";
    case "CANCELLED": return "#9CA3AF";
    default: return "#6B7280";
  }
};

export const CompanyJobsPage = () => {
  const session = useProtectedUser("company");
  const searchParams = useSearchParams();
  const queryQ = searchParams.get("q");

  const [state, setState] = useState<JobsState>({ status: "loading" });
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (queryQ) {
      setSearchQuery(queryQ);
    }
  }, [queryQ]);

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

    return state.jobs.filter((job) => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.assignedFreelancer?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      if (filter === "DRAFT") {
        matchesFilter = job.status === "DRAFT";
      } else if (filter === "ACTIVE") {
        matchesFilter = ["OPEN", "ASSIGNED", "ESCROW_FUNDED", "IN_PROGRESS", "DISPUTED"].includes(job.status);
      } else if (filter === "COMPLETED") {
        matchesFilter = job.status === "COMPLETED";
      }

      return matchesSearch && matchesFilter;
    });
  }, [state, filter, searchQuery]);

  const stats = useMemo(() => {
    if (state.status !== "ready") return { all: 0, drafts: 0, active: 0, completed: 0 };
    
    return {
      all: state.jobs.length,
      drafts: state.jobs.filter(j => j.status === "DRAFT").length,
      active: state.jobs.filter(j => ["OPEN", "ASSIGNED", "ESCROW_FUNDED", "IN_PROGRESS", "DISPUTED"].includes(j.status)).length,
      completed: state.jobs.filter(j => j.status === "COMPLETED").length
    };
  }, [state]);

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Restoring your hiring dashboard and job history.</p>
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
    <WorkspaceLayout
      user={session.user}
      title="Job History"
      subtitle="Manage your entire job lifecycle from draft to completion."
    >
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 24 }}>
        <Link className="button-primary" style={{ backgroundColor: hiringAccent }} href="/jobs/new">
          Post New Job
        </Link>
        <Link className="button-secondary" href="/dashboard">
          Dashboard
        </Link>
      </div>

      <div className="company-dashboard-surface" style={{ marginBottom: 24, padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(["ALL", "ACTIVE", "DRAFT", "COMPLETED"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "1px solid #E5E7EB",
                    backgroundColor: filter === f ? hiringAccent : "white",
                    color: filter === f ? "white" : "#374151",
                    transition: "all 0.2s"
                  }}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()} ({stats[f.toLowerCase() as keyof typeof stats]})
                </button>
              ))}
            </div>
            <div style={{ flex: 1, maxWidth: "300px", position: "relative" }}>
              <input
                type="text"
                placeholder="Search by job title or freelancer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {state.status === "loading" ? (
        <section className="inline-panel">
          <p className="muted">Fetching your job history...</p>
        </section>
      ) : null}

      {state.status === "ready" && filteredJobs.length === 0 ? (
        <section className="inline-panel" style={{ textAlign: "center", padding: "48px 0" }}>
          <h2>No jobs found</h2>
          <p className="muted">
            {searchQuery ? `No jobs matching "${searchQuery}" for the selected filter.` : "You haven't created any jobs yet."}
          </p>
        </section>
      ) : null}

      {state.status === "ready" && filteredJobs.length > 0 ? (
        <div style={{ maxHeight: "800px", overflowY: "auto", paddingRight: "8px" }}>
          <div className="card-stack">
            {filteredJobs.map((job) => {
              const statusColor = getStatusColor(job.status);
              const completedMilestones = job.milestones.filter(m => m.status === "RELEASED" || m.status === "APPROVED").length;
              const progress = job.milestones.length > 0 ? (completedMilestones / job.milestones.length) * 100 : 0;

              return (
                <article className="list-card" key={job.id} style={{ borderLeft: `4px solid ${statusColor}` }}>
                  <div className="list-card-header">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: `${statusColor}15`,
                            color: statusColor,
                            letterSpacing: "0.05em"
                          }}
                        >
                          {getJobStatusLabel(job.status)}
                        </span>
                        <span className="muted" style={{ fontSize: "12px" }}>
                          Created {formatDate(job.createdAt)}
                        </span>
                      </div>
                      <h2 style={{ fontSize: "18px", marginBottom: 4 }}>{job.title}</h2>
                      {job.assignedFreelancer && (
                        <p style={{ fontSize: "14px", color: "#4B5563" }}>
                          Freelancer: <strong>{job.assignedFreelancer.displayName}</strong>
                        </p>
                      )}
                    </div>
                    <Link className="button-secondary" href={`/jobs/${job.id}`}>
                      Manage Job
                    </Link>
                  </div>

                  <div className="status-grid compact-grid" style={{ marginTop: 16 }}>
                    <article className="status-panel">
                      <span className="panel-label">Financials</span>
                      <strong>{formatCurrency(Number(job.budget))}</strong>
                      <p>{job.milestoneCount} milestone(s)</p>
                    </article>

                    <article className="status-panel">
                      <span className="panel-label">Progress</span>
                      <strong>{Math.round(progress)}%</strong>
                      <div style={{ width: "100%", height: "4px", backgroundColor: "#E5E7EB", borderRadius: "2px", marginTop: "4px" }}>
                        <div style={{ width: `${progress}%`, height: "100%", backgroundColor: statusColor, borderRadius: "2px" }} />
                      </div>
                    </article>

                    <article className="status-panel">
                      <span className="panel-label">Latest Update</span>
                      <strong>{formatDate(job.updatedAt)}</strong>
                      <p>
                        {job.status === "DRAFT" 
                          ? (job.brief.validation.score ? `Brief Score: ${job.brief.validation.score}` : "Not validated")
                          : (job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : "In workflow")}
                      </p>
                    </article>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
