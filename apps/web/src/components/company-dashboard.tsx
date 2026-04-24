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
const hiringAccentLight = "#EFF6FF";
const hiringAccentText = "#1e40af";

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
  if (["IN_PROGRESS", "ASSIGNED", "ESCROW_FUNDED"].includes(status)) {
    return {
      label: toSentenceCase(status),
      color: hiringAccent
    };
  }

  if (status === "OPEN") {
    return {
      label: "Live listing",
      color: "#10B981"
    };
  }

  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return {
      label: "Needs Review",
      color: "#F59E0B"
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
  <article className="freelancer-dashboard-stat-card">
    <p className="freelancer-dashboard-stat-label">{label}</p>
    {isLoading ? (
      <>
        <span className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-stat" />
        <span className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
      </>
    ) : (
      <>
        <p className="freelancer-dashboard-stat-value dashboard-mono">{value}</p>
        <p className={`freelancer-dashboard-stat-note is-${sentiment}`}>{supportingText}</p>
      </>
    )}
  </article>
);

const DashboardSectionHeader = ({ label, title, actionHref }: { label: string; title: string; actionHref?: string }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
    <div>
      <p className="freelancer-dashboard-section-label">{label}</p>
      <h2 className="freelancer-dashboard-section-title">{title}</h2>
    </div>
    {actionHref && (
      <Link href={actionHref} style={{ fontSize: 13, color: hiringAccent, fontWeight: 500, textDecoration: "none" }}>
        View all →
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
    () => allJobs.filter((job) => ["IN_PROGRESS", "ASSIGNED", "ESCROW_FUNDED", "DISPUTED"].includes(job.status)),
    [allJobs]
  );

  const pendingReviewCount = useMemo(
    () => allJobs.reduce((sum, job) => 
      sum + job.milestones.filter(m => ["SUBMITTED", "UNDER_REVIEW"].includes(m.status)).length, 
    0),
    [allJobs]
  );

  const pendingApplications = useMemo(
    () => (requestsState.status === "ready" ? requestsState.data.applications.filter(a => a.status === "PENDING") : []),
    [requestsState]
  );

  const totalSpend = useMemo(
    () => allJobs.reduce((sum, job) => sum + (job.escrow?.releasedAmount ?? 0), 0),
    [allJobs]
  );

  const firstName = user.name.split(" ")[0];
  const subtitleText =
    pendingReviewCount > 0
      ? `You have ${pendingReviewCount} milestone submission${pendingReviewCount > 1 ? "s" : ""} awaiting your review.`
      : pendingApplications.length > 0
        ? `You have ${pendingApplications.length} new application${pendingApplications.length > 1 ? "s" : ""} to review.`
        : "Your company hiring workspace overview.";

  return (
    <WorkspaceLayout
      title={`Welcome back, ${firstName}!`}
      subtitle={jobsState.status === "ready" ? subtitleText : "Loading your workspace…"}
      user={user}
    >
      <div className="freelancer-dashboard">
        <section className="freelancer-dashboard-stat-grid" aria-label="Company overview metrics">
          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Total spend"
            sentiment="neutral"
            supportingText="Released milestone payments"
            value={jobsState.status === "ready" ? statValue(totalSpend, (v) => formatCurrency(v, true)) : "--"}
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Active jobs"
            sentiment={activeJobs.length > 0 ? "positive" : "neutral"}
            supportingText={`${activeJobs.length} roles in progress`}
            value={jobsState.status === "ready" ? statValue(activeJobs.length) : "--"}
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Pending reviews"
            sentiment={pendingReviewCount > 0 ? "negative" : "neutral"}
            supportingText={pendingReviewCount > 0 ? "Milestones needing attention" : "Everything is up to date"}
            value={jobsState.status === "ready" ? statValue(pendingReviewCount) : "--"}
          />

          <DashboardStatCard
            isLoading={requestsState.status === "loading"}
            label="New applications"
            sentiment={pendingApplications.length > 0 ? "positive" : "neutral"}
            supportingText="Freelancers waiting for response"
            value={requestsState.status === "ready" ? statValue(pendingApplications.length) : "--"}
          />
        </section>

        <section className="freelancer-dashboard-surface">
          <DashboardSectionHeader
            label="Active Workflow"
            title="Current Job Progress"
            actionHref="/jobs"
          />

          {jobsState.status === "loading" ? (
            <div className="freelancer-dashboard-activity-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <article className="freelancer-dashboard-activity-card" key={`job-skeleton-${index}`}>
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-heading" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-bar" />
                </article>
              ))}
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length === 0 ? (
            <div className="freelancer-dashboard-empty-state">
              <p className="freelancer-dashboard-empty-title">No active work in progress</p>
              <p className="freelancer-dashboard-empty-copy">
                When you hire a freelancer and fund escrow, progress tracking will appear here.
              </p>
              <Link className="button-primary" href="/jobs/new" style={{ marginTop: 16, backgroundColor: hiringAccent }}>
                Post a new job draft
              </Link>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length > 0 ? (
            <div className="freelancer-dashboard-activity-grid">
              {activeJobs.slice(0, 3).map((job) => {
                const completedMilestones = job.milestones.filter(m => ["APPROVED", "RELEASED"].includes(m.status)).length;
                const progressPercent = job.milestones.length > 0 ? Math.round((completedMilestones / job.milestones.length) * 100) : 0;
                const statusTone = getStatusTone(job.status);

                return (
                  <article className="freelancer-dashboard-activity-card" key={job.id}>
                    <div className="freelancer-dashboard-activity-header">
                      <div>
                        <p className="freelancer-dashboard-company">
                          {job.assignedFreelancer?.displayName ?? "Unassigned"}
                        </p>
                        <h3>{job.title}</h3>
                      </div>
                      <span
                        className="freelancer-dashboard-badge"
                        style={{
                          backgroundColor: `${statusTone.color}15`,
                          color: statusTone.color
                        }}
                      >
                        {statusTone.label}
                      </span>
                    </div>

                    <div className="freelancer-dashboard-progress-block">
                      <div className="freelancer-dashboard-progress-row">
                        <p>Progress</p>
                        <strong className="dashboard-mono">{progressPercent}%</strong>
                      </div>
                      <div className="freelancer-dashboard-progress-track">
                        <span
                          className="freelancer-dashboard-progress-fill"
                          style={{ width: `${progressPercent}%`, backgroundColor: hiringAccent }}
                        />
                      </div>
                      <p className="freelancer-dashboard-progress-copy">
                        {completedMilestones} of {job.milestones.length} milestone(s) completed
                      </p>
                    </div>

                    <Link className="freelancer-dashboard-primary-action" href={`/jobs/${job.id}`} style={{ backgroundColor: hiringAccent }}>
                      Open Management Console
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="freelancer-dashboard-bottom-grid">
          <section className="freelancer-dashboard-surface">
            <DashboardSectionHeader
              label="Hiring Pipeline"
              title="Latest Freelancer Requests"
              actionHref="/company/requests"
            />

            {requestsState.status === "ready" && pendingApplications.length === 0 ? (
              <p className="freelancer-dashboard-empty-copy">No new applications to review.</p>
            ) : (
              <div className="card-stack">
                {pendingApplications.slice(0, 4).map(app => (
                  <article key={app.id} className="freelancer-dashboard-upcoming-item" style={{ padding: 12 }}>
                    <div className="freelancer-dashboard-upcoming-header">
                      <div>
                        <p className="freelancer-dashboard-upcoming-title" style={{ fontWeight: 600 }}>{app.freelancerDisplayName}</p>
                        <p className="freelancer-dashboard-upcoming-meta">Applied for: {app.jobTitle}</p>
                      </div>
                      <Link href="/company/requests" style={{ fontSize: 12, color: hiringAccent, fontWeight: 600, textDecoration: "none" }}>Review →</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="freelancer-dashboard-surface">
            <DashboardSectionHeader
              label="Financials"
              title="Recent Escrow Activity"
            />
            {jobsState.status === "ready" && allJobs.filter(j => j.escrow?.status === "FUNDED").length === 0 ? (
              <p className="freelancer-dashboard-empty-copy">No recent escrow transactions.</p>
            ) : (
              <div className="card-stack">
                {allJobs.filter(j => j.escrow).slice(0, 4).map(job => (
                  <article key={job.id} className="freelancer-dashboard-upcoming-item" style={{ padding: 12 }}>
                    <div className="freelancer-dashboard-upcoming-header">
                      <div>
                        <p className="freelancer-dashboard-upcoming-title" style={{ fontWeight: 600 }}>{formatCurrency(job.budget)}</p>
                        <p className="freelancer-dashboard-upcoming-meta">{job.title}</p>
                      </div>
                      <span className="freelancer-dashboard-badge" style={{ backgroundColor: hiringAccentLight, color: hiringAccentText }}>
                        {job.escrow?.status}
                      </span>
                    </div>
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
