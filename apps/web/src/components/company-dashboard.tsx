"use client";

import type {
  JobRecord,
  PublicUser
} from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ApiRequestError, jobsApi, requestsApi } from "@/lib/api";
import { WorkspaceLayout } from "./workspace-layout";

type CompanyDashboardProps = {
  user: PublicUser;
};

type SectionState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

type JobsResponse = Awaited<ReturnType<typeof jobsApi.list>>;
type RequestsResponse = Awaited<ReturnType<typeof requestsApi.listCompanyRequests>>;

const hiringAccent = "#1D4ED8";

const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) {
    return "No date set";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));
};

const toSentenceCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getStatusTone = (status: string) => {
  if (["IN_PROGRESS", "ESCROW_FUNDED"].includes(status)) {
    return {
      label: toSentenceCase(status),
      color: "#0F6E56"
    };
  }

  if (status === "OPEN") {
    return {
      label: "Live",
      color: hiringAccent
    };
  }

  if (status === "DRAFT") {
    return {
      label: "Draft",
      color: "#6B7280"
    };
  }

  if (status === "DISPUTED") {
    return {
      label: "Disputed",
      color: "#DC2626"
    };
  }

  return {
    label: toSentenceCase(status),
    color: "#6B7280"
  };
};

const formatError = (error: unknown, fallback: string) =>
  error instanceof ApiRequestError ? error.message : fallback;

const statValue = (value: number | null, formatter?: (input: number) => string) => {
  if (value === null) {
    return "--";
  }

  return formatter ? formatter(value) : String(value);
};

const DashboardStatCard = ({
  label,
  value,
  supportingText,
  sentiment = "neutral",
  isLoading = false
}: {
  label: string;
  value: string;
  supportingText: string;
  sentiment?: "positive" | "neutral" | "negative" | "hiring";
  isLoading?: boolean;
}) => (
  <article className="company-dashboard-stat-card">
    <p className="company-dashboard-stat-label">{label}</p>
    {isLoading ? (
      <>
        <span className="company-dashboard-skeleton company-dashboard-skeleton-stat" />
        <span className="company-dashboard-skeleton company-dashboard-skeleton-text" />
      </>
    ) : (
      <>
        <p className="company-dashboard-stat-value dashboard-mono">{value}</p>
        <p className={`company-dashboard-stat-note is-${sentiment}`}>{supportingText}</p>
      </>
    )}
  </article>
);

const DashboardSectionHeader = ({ label, title, actionHref, actionLabel }: { label: string; title: string; actionHref?: string; actionLabel?: string }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
    <div>
      <p className="company-dashboard-section-label">{label}</p>
      <h2 className="company-dashboard-section-title">{title}</h2>
    </div>
    {actionHref && (
      <Link href={actionHref} style={{ fontSize: 13, color: hiringAccent, fontWeight: 500, textDecoration: "none" }}>
        {actionLabel ?? "View all →"}
      </Link>
    )}
  </div>
);

export const CompanyDashboard = ({ user }: CompanyDashboardProps) => {
  const [jobsState, setJobsState] = useState<SectionState<JobsResponse>>({
    status: "loading"
  });
  const [requestsState, setRequestsState] = useState<SectionState<RequestsResponse>>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      void jobsApi
        .list()
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setJobsState({
            status: "ready",
            data: response
          });
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          setJobsState({
            status: "error",
            message: formatError(error, "Job data is unavailable right now.")
          });
        });

      void requestsApi
        .listCompanyRequests()
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setRequestsState({
            status: "ready",
            data: response
          });
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          setRequestsState({
            status: "error",
            message: formatError(error, "Requests data is unavailable right now.")
          });
        });
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const allJobs = useMemo(
    () => (jobsState.status === "ready" ? jobsState.data.jobs : []),
    [jobsState]
  );

  const activeJobs = useMemo(
    () => allJobs.filter((job) => ["IN_PROGRESS", "ASSIGNED", "ESCROW_FUNDED"].includes(job.status)),
    [allJobs]
  );

  const draftJobs = useMemo(
    () => allJobs.filter((job) => job.status === "DRAFT"),
    [allJobs]
  );

  const pendingApplications = useMemo(
    () => (requestsState.status === "ready" ? requestsState.data.applications.filter(a => a.status === "PENDING") : []),
    [requestsState]
  );

  const totalBudgetHired = useMemo(
    () => activeJobs.reduce((sum, job) => sum + Number(job.budget), 0),
    [activeJobs]
  );

  const firstName = user.name.split(" ")[0];
  const subtitleText =
    pendingApplications.length > 0
      ? `You have ${pendingApplications.length} new freelancer application${pendingApplications.length > 1 ? "s" : ""} to review.`
      : activeJobs.length > 0
        ? `You have ${activeJobs.length} active job${activeJobs.length > 1 ? "s" : ""} in progress.`
        : "Your company hiring overview.";

  return (
    <WorkspaceLayout
      title={`Welcome back, ${firstName}!`}
      subtitle={jobsState.status === "ready" ? subtitleText : "Loading your workspace…"}
      user={user}
    >
      <div className="company-dashboard">
        <section className="company-dashboard-stat-grid" aria-label="Company overview metrics">
          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Active Jobs"
            sentiment="positive"
            supportingText={
              jobsState.status === "ready"
                ? `${activeJobs.length} roles currently filled`
                : "Loading active work"
            }
            value={jobsState.status === "ready" ? statValue(activeJobs.length) : "--"}
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Committed Budget"
            sentiment="hiring"
            supportingText="Total value in escrow"
            value={
              jobsState.status === "ready"
                ? statValue(totalBudgetHired, (value) => formatCurrency(value, true))
                : "--"
            }
          />

          <DashboardStatCard
            isLoading={requestsState.status === "loading"}
            label="New Requests"
            sentiment={pendingApplications.length > 0 ? "hiring" : "neutral"}
            supportingText={
              requestsState.status === "ready"
                ? pendingApplications.length > 0
                  ? "Pending your review"
                  : "No new applications"
                : "Loading requests"
            }
            value={requestsState.status === "ready" ? statValue(pendingApplications.length) : "--"}
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Open Roles"
            sentiment="hiring"
            supportingText={
              jobsState.status === "ready"
                ? `${allJobs.filter(j => j.status === "OPEN").length} live listings`
                : "Loading listings"
            }
            value={
              jobsState.status === "ready"
                ? statValue(allJobs.filter(j => j.status === "OPEN").length)
                : "--"
            }
          />
        </section>

        <section className="company-dashboard-surface">
          <DashboardSectionHeader
            label="Recent Activity"
            title="Active Work Progress"
            actionHref="/company/active-jobs"
            actionLabel="View history →"
          />

          {jobsState.status === "loading" ? (
            <div className="company-dashboard-activity-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <article className="company-dashboard-activity-card" key={`job-skeleton-${index}`}>
                  <div className="company-dashboard-skeleton company-dashboard-skeleton-text" />
                  <div className="company-dashboard-skeleton company-dashboard-skeleton-stat" />
                </article>
              ))}
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length === 0 ? (
            <div className="company-dashboard-empty-state">
              <p className="company-dashboard-empty-title">No active jobs</p>
              <p className="company-dashboard-empty-copy">
                When you hire a freelancer and fund escrow, progress tracking will appear here.
              </p>
              <div className="action-row" style={{ justifyContent: "center" }}>
                <Link href="/company/active-jobs" className="button-primary">Create a job</Link>
              </div>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length > 0 ? (
            <div className="company-dashboard-activity-grid">
              {activeJobs.map((job) => {
                const statusTone = getStatusTone(job.status);
                const progressPercent = 33; // Mock or calculate if available

                return (
                  <article className="company-dashboard-activity-card" key={job.id}>
                    <div className="company-dashboard-activity-header">
                      <div>
                        <p className="company-dashboard-freelancer">
                          {job.assignedFreelancer?.displayName ?? "Unassigned"}
                        </p>
                        <h3>{job.title}</h3>
                      </div>
                      <span
                        className="company-dashboard-badge"
                        style={{
                          backgroundColor: `${statusTone.color}15`,
                          color: statusTone.color
                        }}
                      >
                        {statusTone.label}
                      </span>
                    </div>

                    <div className="company-dashboard-progress-block">
                      <div className="company-dashboard-progress-row">
                        <p>Progress</p>
                        <strong className="dashboard-mono">{progressPercent}%</strong>
                      </div>
                      <div className="company-dashboard-progress-track">
                        <span
                          className="company-dashboard-progress-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <Link className="company-dashboard-primary-action" href={`/jobs/${job.id}`}>
                      Manage Job
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="company-dashboard-bottom-grid">
          <section className="company-dashboard-surface">
            <DashboardSectionHeader
              label="Pipeline"
              title="Drafts and Pending"
              actionHref="/company/active-jobs"
            />

            {jobsState.status === "ready" && draftJobs.length === 0 ? (
              <p className="company-dashboard-empty-copy">No drafts currently in progress.</p>
            ) : (
              <div className="card-stack">
                {draftJobs.slice(0, 3).map(job => (
                  <article key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #E5E7EB", borderRadius: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{job.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>Created {formatDate(job.createdAt)}</p>
                    </div>
                    <Link href={`/jobs/${job.id}`} style={{ fontSize: 13, fontWeight: 600, color: hiringAccent }}>Edit</Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="company-dashboard-surface">
            <DashboardSectionHeader
              label="Talent"
              title="Recent Applications"
              actionHref="/company/requests"
            />

            {requestsState.status === "ready" && pendingApplications.length === 0 ? (
              <p className="company-dashboard-empty-copy">No new talent applications to review.</p>
            ) : (
              <div className="card-stack">
                {pendingApplications.slice(0, 3).map(app => (
                  <article key={app.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #E5E7EB", borderRadius: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{app.freelancerDisplayName}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>Applied for {app.jobTitle}</p>
                    </div>
                    <Link href="/company/requests" style={{ fontSize: 13, fontWeight: 600, color: hiringAccent }}>Review</Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
