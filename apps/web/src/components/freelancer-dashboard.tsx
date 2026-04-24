"use client";

import type {
  FreelancerJobRecord,
  IncomeStatementRecord,
  JobMatchRecord,
  MilestoneStatus,
  PublicUser
} from "@gighub/shared";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { WorkspaceLayout } from "./workspace-layout";

type FreelancerDashboardProps = {
  user: PublicUser;
};

type SectionState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

type JobsResponse = Awaited<ReturnType<typeof freelancerWorkspaceApi.listJobs>>;
type IncomeResponse = Awaited<ReturnType<typeof freelancerWorkspaceApi.getIncome>>;
type MatchesResponse = Awaited<ReturnType<typeof freelancerWorkspaceApi.listJobMatches>>;

type DeadlineItem = {
  milestoneId: string;
  milestoneTitle: string;
  jobTitle: string;
  companyName: string;
  dueAt: string;
  urgencyLabel: string;
  urgencyColor: string;
};

type MonthlyIncomeBar = {
  key: string;
  label: string;
  amount: number;
};

const freelancerAccent = "#0F6E56";
const freelancerAccentLight = "#E1F5EE";
const freelancerAccentText = "#085041";

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

const formatMonthLabel = (value: Date) =>
  new Intl.DateTimeFormat("en-MY", {
    month: "short"
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

const getCurrentMilestone = (job: FreelancerJobRecord) =>
  job.milestones.find((milestone) => !isCompletedMilestone(milestone.status)) ??
  job.milestones[job.milestones.length - 1] ??
  null;

const getNextDueMilestone = (job: FreelancerJobRecord) => {
  const dueSoon = job.milestones
    .filter((milestone) => milestone.dueAt !== null && !isCompletedMilestone(milestone.status))
    .sort((left, right) => new Date(left.dueAt ?? 0).getTime() - new Date(right.dueAt ?? 0).getTime());

  return dueSoon[0] ?? getCurrentMilestone(job);
};

const getStatusTone = (status: MilestoneStatus | null) => {
  if (status === "IN_PROGRESS") {
    return {
      label: "In progress",
      color: freelancerAccent
    };
  }

  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    return {
      label: "Under review",
      color: "#1D4ED8"
    };
  }

  if (status === "REVISION_REQUESTED" || status === "PENDING") {
    return {
      label: toSentenceCase(status),
      color: "#B45309"
    };
  }

  if (status === "DISPUTED") {
    return {
      label: "Disputed",
      color: "#DC2626"
    };
  }

  if (status === "APPROVED" || status === "RELEASED") {
    return {
      label: toSentenceCase(status),
      color: freelancerAccent
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
      color: freelancerAccent
    };
  }

  return {
    label: "Upcoming",
    color: "#6B7280"
  };
};

const buildDeadlineItems = (jobs: FreelancerJobRecord[]): DeadlineItem[] =>
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
            companyName: job.companyName,
            dueAt: milestone.dueAt!,
            urgencyLabel: urgency.label,
            urgencyColor: urgency.color
          };
        })
    )
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

const buildMonthlyIncomeBars = (
  statements: IncomeStatementRecord[],
  latestStatement: IncomeStatementRecord | null
): MonthlyIncomeBar[] => {
  const sourceStatements =
    statements.length > 0 ? statements : latestStatement ? [latestStatement] : [];
  const uniqueLineItems = new Map<string, IncomeStatementRecord["lineItems"][number]>();

  sourceStatements.forEach((statement) => {
    statement.lineItems.forEach((lineItem) => {
      uniqueLineItems.set(lineItem.id, lineItem);
    });
  });

  const releasedItems = Array.from(uniqueLineItems.values());

  if (releasedItems.length === 0) {
    return [];
  }

  const latestRelease = releasedItems.reduce((latest, lineItem) => {
    const releasedAt = new Date(lineItem.releasedAt);
    return releasedAt.getTime() > latest.getTime() ? releasedAt : latest;
  }, new Date(releasedItems[0].releasedAt));

  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const value = new Date(latestRelease.getFullYear(), latestRelease.getMonth() - (5 - index), 1);
    const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      label: formatMonthLabel(value),
      amount: 0
    };
  });
  const barMap = new Map(monthKeys.map((bar) => [bar.key, bar]));

  releasedItems.forEach((lineItem) => {
    const releasedAt = new Date(lineItem.releasedAt);
    const key = `${releasedAt.getFullYear()}-${String(releasedAt.getMonth() + 1).padStart(2, "0")}`;
    const bar = barMap.get(key);

    if (bar) {
      bar.amount += lineItem.amount;
    }
  });

  return monthKeys;
};

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

export const FreelancerDashboard = ({ user }: FreelancerDashboardProps) => {
  const [jobsState, setJobsState] = useState<SectionState<JobsResponse>>({
    status: "loading"
  });
  const [incomeState, setIncomeState] = useState<SectionState<IncomeResponse>>({
    status: "loading"
  });
  const [matchesState, setMatchesState] = useState<SectionState<MatchesResponse>>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      void freelancerWorkspaceApi
        .listJobs()
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
            message: formatError(error, "Active work is unavailable right now.")
          });
        });

      void freelancerWorkspaceApi
        .getIncome()
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setIncomeState({
            status: "ready",
            data: response
          });
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          setIncomeState({
            status: "error",
            message: formatError(error, "Income history is unavailable right now.")
          });
        });

      void freelancerWorkspaceApi
        .listJobMatches()
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setMatchesState({
            status: "ready",
            data: response
          });
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          setMatchesState({
            status: "error",
            message: formatError(error, "Recommended jobs are unavailable right now.")
          });
        });
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeJobs = useMemo(
    () =>
      jobsState.status === "ready"
        ? jobsState.data.jobs.filter((job) => job.status !== "COMPLETED")
        : [],
    [jobsState]
  );

  const pendingReviewCount = useMemo(
    () =>
      activeJobs.reduce(
        (sum, job) =>
          sum + job.milestones.filter((milestone) => reviewMilestoneStatuses.includes(milestone.status)).length,
        0
      ),
    [activeJobs]
  );

  const totalActiveMilestones = useMemo(
    () =>
      activeJobs.reduce(
        (sum, job) => sum + job.milestones.filter((milestone) => !isCompletedMilestone(milestone.status)).length,
        0
      ),
    [activeJobs]
  );

  const deadlineItems = useMemo(() => buildDeadlineItems(activeJobs), [activeJobs]);

  const monthlyIncomeBars = useMemo(
    () =>
      incomeState.status === "ready"
        ? buildMonthlyIncomeBars(incomeState.data.statements, incomeState.data.summary.latestStatement)
        : [],
    [incomeState]
  );

  const peakIncomeBar = useMemo(
    () =>
      monthlyIncomeBars.reduce<MonthlyIncomeBar | null>(
        (peak, bar) => (!peak || bar.amount > peak.amount ? bar : peak),
        monthlyIncomeBars[0] ?? null
      ),
    [monthlyIncomeBars]
  );

  const chartAverage = useMemo(() => {
    if (monthlyIncomeBars.length === 0) {
      return 0;
    }

    const total = monthlyIncomeBars.reduce((sum, bar) => sum + bar.amount, 0);
    return total / monthlyIncomeBars.length;
  }, [monthlyIncomeBars]);

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
  const maxBarAmount = Math.max(...monthlyIncomeBars.map((bar) => bar.amount), 1);

  const firstName = user.name.split(" ")[0];
  const subtitleText =
    pendingReviewCount > 0
      ? `You have ${pendingReviewCount} milestone${pendingReviewCount > 1 ? "s" : ""} awaiting review.`
      : deadlineItems.length > 0
        ? `You have ${deadlineItems.length} upcoming deadline${deadlineItems.length > 1 ? "s" : ""} this week.`
        : "Your freelancer workspace overview.";

  return (
    <WorkspaceLayout
      title={`Welcome back, ${firstName}!`}
      subtitle={jobsState.status === "ready" ? subtitleText : "Loading your workspace…"}
      user={user}
    >
      <div className="freelancer-dashboard">
        <section className="freelancer-dashboard-stat-grid" aria-label="Freelancer overview metrics">
          <DashboardStatCard
            isLoading={incomeState.status === "loading"}
            label="Total earned"
            sentiment={incomeState.status === "ready" && incomeState.data.summary.totalEarned > 0 ? "positive" : "neutral"}
            supportingText={
              incomeState.status === "ready"
                ? incomeState.data.summary.releasedMilestones > 0
                  ? `${incomeState.data.summary.releasedMilestones} released milestone(s)`
                  : "No released milestones yet"
                : incomeState.status === "error"
                  ? "Income history unavailable"
                  : "Loading earnings summary"
            }
            value={
              incomeState.status === "ready"
                ? statValue(incomeState.data.summary.totalEarned, (value) => formatCurrency(value, true))
                : "--"
            }
          />

          <DashboardStatCard
            isLoading={jobsState.status === "loading"}
            label="Active jobs"
            sentiment={activeJobs.length > 0 ? "positive" : "neutral"}
            supportingText={
              jobsState.status === "ready"
                ? totalActiveMilestones > 0
                  ? `${totalActiveMilestones} milestone(s) in progress`
                  : "No open milestones right now"
                : jobsState.status === "error"
                  ? "Workload unavailable"
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
                  ? "Awaiting company review"
                  : "Nothing waiting on review"
                : jobsState.status === "error"
                  ? "Review status unavailable"
                  : "Loading review status"
            }
            value={jobsState.status === "ready" ? statValue(pendingReviewCount) : "--"}
          />

          <DashboardStatCard
            isLoading={matchesState.status === "loading"}
            label="Recommended jobs"
            sentiment={matchesState.status === "ready" && matchesState.data.matches.length > 0 ? "positive" : "neutral"}
            supportingText={
              matchesState.status === "ready"
                ? "Available in Job Request"
                : matchesState.status === "error"
                  ? "Recommendations unavailable"
                  : "Loading job matches"
            }
            value={
              matchesState.status === "ready"
                ? statValue(matchesState.data.matches.length)
                : "--"
            }
          />
        </section>

        <section className="freelancer-dashboard-surface">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Recent Activity
            </p>
            <Link href="/freelancer/active-jobs" style={{ fontSize: 13, color: freelancerAccent, fontWeight: 500, textDecoration: "none" }}>
              View all →
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
              <p className="freelancer-dashboard-empty-title">Active work unavailable</p>
              <p className="freelancer-dashboard-empty-copy">{jobsState.message}</p>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length === 0 ? (
            <div className="freelancer-dashboard-empty-state">
              <p className="freelancer-dashboard-empty-title">No active jobs yet</p>
              <p className="freelancer-dashboard-empty-copy">
                New assignments and review-stage jobs will appear here once companies move work forward.
              </p>
            </div>
          ) : null}

          {jobsState.status === "ready" && activeJobs.length > 0 ? (
            <div className="freelancer-dashboard-activity-grid">
              {activeJobs.map((job) => {
                const currentMilestone = getCurrentMilestone(job);
                const nextDueMilestone = getNextDueMilestone(job);
                const completedMilestones = job.milestones.filter((milestone) =>
                  isCompletedMilestone(milestone.status)
                ).length;
                const progressPercent =
                  job.milestones.length > 0
                    ? Math.round((completedMilestones / job.milestones.length) * 100)
                    : 0;
                const statusTone = getStatusTone(currentMilestone?.status ?? null);
                const openHref = "/freelancer/active-jobs";

                return (
                  <article className="freelancer-dashboard-activity-card" key={job.id}>
                    <div className="freelancer-dashboard-activity-header">
                      <div>
                        <p className="freelancer-dashboard-company">{job.companyName}</p>
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
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="freelancer-dashboard-progress-copy">
                        {completedMilestones} of {job.milestones.length} milestone(s) completed
                      </p>
                    </div>

                    <dl className="freelancer-dashboard-detail-grid">
                      <div>
                        <dt>Current milestone</dt>
                        <dd>{currentMilestone ? currentMilestone.title : "Milestone setup pending"}</dd>
                      </div>
                      <div>
                        <dt>Next due</dt>
                        <dd>{nextDueMilestone ? formatDate(nextDueMilestone.dueAt) : "No due date"}</dd>
                      </div>
                    </dl>

                    <Link className="freelancer-dashboard-primary-action" href={openHref}>
                      View active work
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="freelancer-dashboard-bottom-grid">
          <section className="freelancer-dashboard-surface">
            <DashboardSectionHeader label="Upcoming deadlines" title="Calendar and due-soon view" />

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

            {jobsState.status === "error" ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">Upcoming deadlines unavailable</p>
                <p className="freelancer-dashboard-empty-copy">{jobsState.message}</p>
              </div>
            ) : null}

            {jobsState.status === "ready" && deadlineItems.length === 0 ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">No deadlines scheduled</p>
                <p className="freelancer-dashboard-empty-copy">
                  Due dates will appear here when milestones are assigned a delivery window.
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
                        <span className={className} key={`calendar-cell-${index}`}>
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
                            {item.jobTitle} · {item.companyName}
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
            <DashboardSectionHeader label="Income history" title="Monthly earnings trend" />

            {incomeState.status === "loading" ? (
              <div className="freelancer-dashboard-income-shell">
                <div className="freelancer-dashboard-income-chart">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div className="freelancer-dashboard-income-bar-column" key={`chart-skeleton-${index}`}>
                      <span className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-text" />
                      <div className="freelancer-dashboard-income-bar-track">
                        <span
                          className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-bar-vertical"
                        />
                      </div>
                      <span className="freelancer-dashboard-skeleton freelancer-dashboard-skeleton-day" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {incomeState.status === "error" ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">Income history unavailable</p>
                <p className="freelancer-dashboard-empty-copy">{incomeState.message}</p>
              </div>
            ) : null}

            {incomeState.status === "ready" && monthlyIncomeBars.length === 0 ? (
              <div className="freelancer-dashboard-empty-state">
                <p className="freelancer-dashboard-empty-title">No earnings history yet</p>
                <p className="freelancer-dashboard-empty-copy">
                  Released income will appear here after escrow milestones are completed and recorded.
                </p>
              </div>
            ) : null}

            {incomeState.status === "ready" && monthlyIncomeBars.length > 0 ? (
              <div className="freelancer-dashboard-income-shell">
                <div className="freelancer-dashboard-income-chart" aria-label="Monthly earnings chart">
                  {monthlyIncomeBars.map((bar) => {
                    const height = Math.max((bar.amount / maxBarAmount) * 100, bar.amount > 0 ? 14 : 0);

                    return (
                      <div className="freelancer-dashboard-income-bar-column" key={bar.key}>
                        <span className="freelancer-dashboard-income-bar-value dashboard-mono">
                          {bar.amount > 0 ? formatCurrency(bar.amount, true) : "RM 0"}
                        </span>
                        <div className="freelancer-dashboard-income-bar-track" aria-hidden="true">
                          <span
                            className="freelancer-dashboard-income-bar-fill"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="freelancer-dashboard-income-bar-label">{bar.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="freelancer-dashboard-income-summary-grid">
                  <article className="freelancer-dashboard-summary-card">
                    <p className="freelancer-dashboard-summary-label">Highest month</p>
                    <strong className="dashboard-mono">
                      {peakIncomeBar ? formatCurrency(peakIncomeBar.amount, true) : "RM 0"}
                    </strong>
                    <p className="freelancer-dashboard-summary-copy">
                      {peakIncomeBar ? `${peakIncomeBar.label} performed best.` : "No released month yet."}
                    </p>
                  </article>

                  <article className="freelancer-dashboard-summary-card">
                    <p className="freelancer-dashboard-summary-label">Current month</p>
                    <strong className="dashboard-mono">
                      {formatCurrency(monthlyIncomeBars[monthlyIncomeBars.length - 1]?.amount ?? 0, true)}
                    </strong>
                    <p className="freelancer-dashboard-summary-copy">
                      Released income in the latest tracked month.
                    </p>
                  </article>

                  <article className="freelancer-dashboard-summary-card">
                    <p className="freelancer-dashboard-summary-label">Average</p>
                    <strong className="dashboard-mono">{formatCurrency(chartAverage, true)}</strong>
                    <p className="freelancer-dashboard-summary-copy">Average monthly release across this chart.</p>
                  </article>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
