"use client";

import type {
  JobRecord,
  CompanyJobApplicationRecord,
  CompanyJobInvitationRecord,
  MilestoneStatus,
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

type DeadlineItem = {
  milestoneId: string;
  milestoneTitle: string;
  jobTitle: string;
  freelancerName: string;
  dueAt: string;
  urgencyLabel: string;
  urgencyColor: string;
};

const companyAccent = "#1D4ED8";
const companyAccentLight = "#EFF6FF";
const companyAccentText = "#1e40af";

const reviewMilestoneStatuses: MilestoneStatus[] = ["SUBMITTED", "UNDER_REVIEW"];
const completedMilestoneStatuses: MilestoneStatus[] = ["APPROVED", "RELEASED"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatCurrency = (value: number, compact = false) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) {
    return "No due date";
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

const isCompletedMilestone = (status: MilestoneStatus) => completedMilestoneStatuses.includes(status);

const getStatusTone = (status: MilestoneStatus | null) => {
  if (status === "IN_PROGRESS" || status === "APPROVED" || status === "RELEASED") {
    return {
      label: toSentenceCase(status ?? "PENDING"),
      color: companyAccent
    };
  }

  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return {
      label: "Needs review",
      color: "#F59E0B"
    };
  }

  if (status === "REVISION_REQUESTED") {
    return {
      label: "Revision sent",
      color: "#6366F1"
    };
  }

  if (status === "DISPUTED") {
    return {
      label: "Disputed",
      color: "#DC2626"
    };
  }

  return {
    label: "Queued",
    color: "#6B7280"
  };
};

const getUrgencyTone = (dueAt: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueAt);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: "Overdue",
      color: "#DC2626"
    };
  }

  if (diffDays === 0) {
    return {
      label: "Today",
      color: "#DC2626"
    };
  }

  if (diffDays === 1) {
    return {
      label: "Tomorrow",
      color: "#B45309"
    };
  }

  if (diffDays <= 7) {
    return {
      label: "This week",
      color: companyAccent
    };
  }

  return {
    label: "Upcoming",
    color: "#6B7280"
  };
};

const buildDeadlineItems = (jobs: JobRecord[]): DeadlineItem[] =>
  jobs
    .flatMap((job) =>
      job.milestones
        .filter((milestone) => milestone.dueAt !== null && !isCompletedMilestone(milestone.status))
        .map((milestone) => {
          const urgency = getUrgencyTone(milestone.dueAt!);

          return {
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            jobTitle: job.title,
            freelancerName: job.assignedFreelancer?.displayName ?? "Unassigned",
            dueAt: milestone.dueAt!,
            urgencyLabel: urgency.label,
            urgencyColor: urgency.color
          };
        })
    )
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

const getCalendarCells = (referenceDate: Date) => {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const daysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
  const leadingEmptyCells = firstDay.getDay();
  const totalCells = Math.ceil((leadingEmptyCells + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dateNumber = index - leadingEmptyCells + 1;

    if (dateNumber <= 0 || dateNumber > daysInMonth) {
      return null;
    }

    return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dateNumber);
  });
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
  sentiment?: "positive" | "neutral" | "negative";
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

const DashboardSectionHeader = ({ label, title }: { label: string; title: string }) => (
  <div className="freelancer-dashboard-section-header">
    <p className="freelancer-dashboard-section-label">{label}</p>
    <h2 className="freelancer-dashboard-section-title">{title}</h2>
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
            message: formatError(error, "Jobs data is unavailable right now.")
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
            message: formatError(error, "Requests are unavailable right now.")
          });
        });
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const allJobs = useMemo(() => (jobsState.status === "ready" ? jobsState.data.jobs : []), [jobsState]);

  const activeJobs = useMemo(
    () => allJobs.filter((job) => ["ASSIGNED", "ESCROW_FUNDED", "IN_PROGRESS"].includes(job.status)),
    [allJobs]
  );

  const pendingReviewCount = useMemo(
    () =>
      allJobs.reduce(
        (sum, job) =>
          sum + job.milestones.filter((milestone) => reviewMilestoneStatuses.includes(milestone.status)).length,
        0
      ),
    [allJobs]
  );

  const totalSpend = useMemo(
    () =>
      allJobs.reduce((sum, job) => sum + (job.escrow?.releasedAmount ?? 0), 0),
    [allJobs]
  );

  const pendingApplications = useMemo(
    () => (requestsState.status === "ready" ? requestsState.data.applications.filter(a => a.status === "PENDING") : []),
    [requestsState]
  );

  const deadlineItems = useMemo(() => buildDeadlineItems(activeJobs), [activeJobs]);

  const referenceCalendarDate = deadlineItems[0] ? new Date(deadlineItems[0].dueAt) : new Date();
  const dueDateSet = new Set(
    deadlineItems
      .filter((item) => {
        const date = new Date(item.dueAt);
        return (
          date.getFullYear() === referenceCalendarDate.getFullYear() &&
          date.getMonth() === referenceCalendarDate.getMonth()
        );
      })
      .map((item) => new Date(item.dueAt).getDate())
  );
  const calendarCells = getCalendarCells(referenceCalendarDate);

  const firstName = user.name.split(" ")[0];
  const subtitleText =
    pendingReviewCount > 0
      ? `You have ${pendingReviewCount} milestone${pendingReviewCount > 1 ? "s" : ""} awaiting your review.`
      : pendingApplications.length > 0
        ? `You have ${pendingApplications.length} new application${pendingApplications.length > 1 ? "s" : ""} to review.`
        : "Your company workspace overview.";

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
            supportingText={
              jobsState.status === "ready"
                ? "Released milestone payments"
                : "Loading spend summary"
            }
            value={
              jobsState.status === "ready"
                ? statValue(totalSpend, (value) => formatCurrency(value, true))
                : "--"
            }
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Active jobs"
            sentiment={activeJobs.length > 0 ? "positive" : "neutral"}
            supportingText={
              jobsState.status === "ready"
                ? `${activeJobs.length} work-in-progress roles`
                : "Loading active work"
            }
            value={jobsState.status === "ready" ? statValue(activeJobs.length) : "--"}
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Pending reviews"
            sentiment={pendingReviewCount > 0 ? "negative" : "neutral"}
            supportingText={
              jobsState.status === "ready"
                ? pendingReviewCount > 0
                  ? "Milestones awaiting approval"
                  : "Everything is up to date"
                : "Loading review status"
            }
            value={jobsState.status === "ready" ? statValue(pendingReviewCount) : "--"}
          />

          <DashboardStatCard
            isLoading={requestsState.status === "loading"}
            label="New applications"
            sentiment={pendingApplications.length > 0 ? "positive" : "neutral"}
            supportingText={
              requestsState.status === "ready"
                ? "Freelancers waiting for response"
                : "Loading applications"
            }
            value={
              requestsState.status === "ready"
                ? statValue(pendingApplications.length)
                : "--"
            }
          />
        </section>

        <section className="freelancer-dashboard-surface">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Active Job Progress
            </p>
            <Link href="/jobs" style={{ fontSize: 13, color: companyAccent, fontWeight: 500, textDecoration: "none" }}>
              View all jobs →
            </Link>
          </div>

          {jobsState.status === "loading" ? (
            <div className="freelancer-dashboard-activity-grid" aria-label="Loading active work">
              {Array.from({ length: 3 }, (_, index) => (
                <article className="freelancer-dashboard-activity-card" key={`job-skeleton-${index}`}>
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-pill" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-heading" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-bar" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-button" />
                </article>
              ))}
            </div>
          ) : null}

          {jobsState.status === "error" ? (
            <div className="freelancer-dashboard-empty-state">
              <p className="freelancer-dashboard-empty-title">Job data unavailable</p>
              <p className="freelancer-dashboard-empty-copy">{jobsState.message}</p>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length === 0 ? (
            <div className="freelancer-dashboard-empty-state">
              <p className="freelancer-dashboard-empty-title">No active jobs</p>
              <p className="freelancer-dashboard-empty-copy">
                Assigned jobs with funded escrow will appear here once freelancers start working.
              </p>
              <Link className="button-primary" href="/jobs/new" style={{ marginTop: 16 }}>
                Create job draft
              </Link>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length > 0 ? (
            <div className="freelancer-dashboard-activity-grid">
              {activeJobs.slice(0, 3).map((job) => {
                const completedMilestones = job.milestones.filter((milestone) =>
                  isCompletedMilestone(milestone.status)
                ).length;
                const progressPercent =
                  job.milestones.length > 0
                    ? Math.round((completedMilestones / job.milestones.length) * 100)
                    : 0;
                
                const currentMilestone = job.milestones.find(m => !isCompletedMilestone(m.status)) ?? job.milestones[job.milestones.length - 1];
                const statusTone = getStatusTone(currentMilestone?.status ?? null);

                return (
                  <article className="freelancer-dashboard-activity-card" key={job.id}>
                    <div className="freelancer-dashboard-activity-header">
                      <div>
                        <p className="freelancer-dashboard-company">{job.assignedFreelancer?.displayName ?? "Unassigned"}</p>
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
                      <div className="freelancer-dashboard-progress-track" aria-hidden="true">
                        <span
                          className="freelancer-dashboard-progress-fill"
                          style={{ width: `${progressPercent}%`, backgroundColor: companyAccent }}
                        />
                      </div>
                      <p className="freelancer-dashboard-progress-copy">
                        {completedMilestones} of {job.milestones.length} milestone(s) released
                      </p>
                    </div>

                    <dl className="freelancer-dashboard-detail-grid">
                      <div>
                        <dt>Budget</dt>
                        <dd>{formatCurrency(job.budget, true)}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{toSentenceCase(job.status)}</dd>
                      </div>
                    </dl>

                    <Link className="freelancer-dashboard-primary-action" href={`/jobs/${job.id}`} style={{ backgroundColor: companyAccent }}>
                      Open Job Details
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="freelancer-dashboard-bottom-grid">
          <section className="freelancer-dashboard-surface">
            <DashboardSectionHeader label="Delivery Schedule" title="Upcoming milestone deadlines" />

            {jobsState.status === "loading" ? (
              <div className="freelancer-dashboard-deadline-grid">
                <div className="freelancer-dashboard-calendar-card">
                  <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                  <div className="freelancer-dashboard-calendar-skeleton-grid">
                    {Array.from({ length: 35 }, (_, index) => (
                      <span className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-day" key={index} />
                    ))}
                  </div>
                </div>
                <div className="freelancer-dashboard-upcoming-list">
                  {Array.from({ length: 3 }, (_, index) => (
                    <article className="freelancer-dashboard-upcoming-item" key={`deadline-skeleton-${index}`}>
                      <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-heading" />
                      <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {jobsState.status === "ready" && deadlineItems.length === 0 ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">No upcoming deadlines</p>
                <p className="freelancer-dashboard-empty-copy">
                  Deadlines will appear here when active milestones have due dates.
                </p>
              </div>
            ) : null}

            {jobsState.status === "ready" && deadlineItems.length > 0 ? (
              <div className="freelancer-dashboard-deadline-grid">
                <div className="freelancer-dashboard-calendar-card">
                  <div className="freelancer-dashboard-calendar-header">
                    <p>{new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(referenceCalendarDate)}</p>
                  </div>
                  <div className="freelancer-dashboard-calendar-grid is-weekdays">
                    {weekdayLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className="freelancer-dashboard-calendar-grid">
                    {calendarCells.map((cell, index) => {
                      const isToday =
                        cell !== null &&
                        cell.toDateString() === new Date().toDateString();
                      const hasDeadline = cell !== null && dueDateSet.has(cell.getDate());
                      const className = [
                        "freelancer-dashboard-calendar-day",
                        isToday ? "is-today" : "",
                        hasDeadline ? "is-highlighted" : ""
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <span className={className} key={`calendar-cell-${index}`} style={hasDeadline ? { backgroundColor: companyAccentLight, color: companyAccentText } : {}}>
                          {cell ? cell.getDate() : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="freelancer-dashboard-upcoming-list">
                  {deadlineItems.slice(0, 4).map((item) => (
                    <article className="freelancer-dashboard-upcoming-item" key={item.milestoneId}>
                      <div className="freelancer-dashboard-upcoming-header">
                        <div>
                          <p className="freelancer-dashboard-upcoming-title">{item.milestoneTitle}</p>
                          <p className="freelancer-dashboard-upcoming-meta">
                            {item.jobTitle} · {item.freelancerName}
                          </p>
                        </div>
                        <span
                          className="freelancer-dashboard-badge"
                          style={{
                            backgroundColor: `${item.urgencyColor}15`,
                            color: item.urgencyColor
                          }}
                        >
                          {item.urgencyLabel}
                        </span>
                      </div>
                      <p className="freelancer-dashboard-upcoming-date">{formatDate(item.dueAt)}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="freelancer-dashboard-surface">
            <DashboardSectionHeader label="Job Requests" title="Latest freelancer applications" />

            {requestsState.status === "loading" ? (
              <div className="freelancer-dashboard-upcoming-list">
                {Array.from({ length: 4 }, (_, index) => (
                  <article className="freelancer-dashboard-upcoming-item" key={`req-skeleton-${index}`}>
                    <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-heading" />
                    <div className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                  </article>
                ))}
              </div>
            ) : null}

            {requestsState.status === "ready" && pendingApplications.length === 0 ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">No new applications</p>
                <p className="freelancer-dashboard-empty-copy">
                  When you publish jobs, freelancers will apply and their requests will show up here.
                </p>
                <Link className="button-secondary" href="/requests" style={{ marginTop: 16 }}>
                  View all requests
                </Link>
              </div>
            ) : null}

            {requestsState.status === "ready" && pendingApplications.length > 0 ? (
              <div className="freelancer-dashboard-upcoming-list">
                {pendingApplications.slice(0, 5).map((app) => (
                  <article className="freelancer-dashboard-upcoming-item" key={app.id}>
                    <div className="freelancer-dashboard-upcoming-header">
                      <div>
                        <p className="freelancer-dashboard-upcoming-title">{app.freelancerDisplayName}</p>
                        <p className="freelancer-dashboard-upcoming-meta">
                          applied for: {app.freelancerEmail}
                        </p>
                      </div>
                      <span
                        className="freelancer-dashboard-badge"
                        style={{
                          backgroundColor: `${companyAccent}15`,
                          color: companyAccent
                        }}
                      >
                        New
                      </span>
                    </div>
                    <p className="freelancer-dashboard-upcoming-date" style={{ color: "#374151", marginTop: 8 }}>
                      {app.coverNote ? `"${app.coverNote.slice(0, 60)}..."` : "No cover note provided."}
                    </p>
                    <Link href="/requests" style={{ fontSize: 12, color: companyAccent, fontWeight: 500, textDecoration: "none", marginTop: 8, display: "inline-block" }}>
                      Review application →
                    </Link>
                  </article>
                ))}
                {pendingApplications.length > 5 && (
                  <Link href="/requests" className="freelancer-dashboard-primary-action" style={{ backgroundColor: "transparent", color: companyAccent, border: `1px solid ${companyAccent}`, marginTop: 12 }}>
                    View all {pendingApplications.length} applications
                  </Link>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
