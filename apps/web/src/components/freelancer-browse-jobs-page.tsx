"use client";

import type { JobApplicationRecord, JobAvailabilityRecord } from "@gighub/shared";
import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ApiRequestError, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type BrowseState =
  | { status: "loading" }
  | {
      status: "ready";
      jobs: JobAvailabilityRecord[];
      applications: JobApplicationRecord[];
    }
  | { status: "error"; message: string };

type SortValue = "newest" | "budget-desc" | "budget-asc";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));

const getPublishedTimestamp = (value: string | null) => (value ? new Date(value).getTime() : 0);

const parseBudget = (value: string) => {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toSentenceCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatRequestError = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "The running API process does not include the request routes yet. Restart API (npm run dev) and retry.";
  }

  return error instanceof ApiRequestError ? error.message : fallback;
};

export const FreelancerBrowseJobsPage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<BrowseState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("newest");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const reload = async () => {
    try {
      const [availability, requests] = await Promise.all([
        requestsApi.listAvailability(),
        requestsApi.listFreelancerRequests()
      ]);

      setState({
        status: "ready",
        jobs: availability.jobs,
        applications: requests.applications
      });
    } catch (loadError) {
      setState({
        status: "error",
        message: formatRequestError(loadError, "Unable to load browse jobs right now.")
      });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void reload();
    }
  }, [session.status]);

  const applicationByJobId = useMemo(() => {
    if (state.status !== "ready") {
      return new Map<string, JobApplicationRecord>();
    }

    return new Map(state.applications.map((application) => [application.jobId, application]));
  }, [state]);

  const filteredJobs = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    const query = deferredSearchTerm.trim().toLowerCase();
    const minimumBudget = parseBudget(minBudget);
    const maximumBudget = parseBudget(maxBudget);
    const jobs = state.jobs.filter((job) => {
      const matchesQuery =
        query.length === 0 || `${job.title} ${job.companyName}`.toLowerCase().includes(query);
      const matchesMinimumBudget = minimumBudget === null || job.budget >= minimumBudget;
      const matchesMaximumBudget = maximumBudget === null || job.budget <= maximumBudget;

      return matchesQuery && matchesMinimumBudget && matchesMaximumBudget;
    });

    return jobs.sort((left, right) => {
      if (sortValue === "budget-desc") {
        return right.budget - left.budget;
      }

      if (sortValue === "budget-asc") {
        return left.budget - right.budget;
      }

      return getPublishedTimestamp(right.publishedAt) - getPublishedTimestamp(left.publishedAt);
    });
  }, [deferredSearchTerm, maxBudget, minBudget, sortValue, state]);

  if (session.status !== "ready") {
    return null;
  }

  const handleApply = (jobId: string) => {
    setError(null);
    setApplyingJobId(jobId);

    startTransition(async () => {
      try {
        await requestsApi.applyToJob(jobId, { coverNote: "" });
        await reload();
      } catch (applyError) {
        setError(formatRequestError(applyError, "Unable to apply right now."));
      } finally {
        setApplyingJobId(null);
      }
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortValue("newest");
    setMinBudget("");
    setMaxBudget("");
  };

  return (
    <WorkspaceLayout
      title="Browse Job"
      subtitle="Browse currently applyable jobs from companies and apply from one place."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {state.status === "loading" ? <p className="muted">Loading browse jobs...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div className="browse-job-layout">
          <section aria-label="Browse job filters" className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="browse-job-section-label">Browse controls</p>
                <h2 className="browse-job-section-title">Search, sort, and filter</h2>
              </div>
              <button className="button-secondary" onClick={clearFilters} type="button" style={{ fontSize: "12px", padding: "6px 14px" }}>
                Clear filters
              </button>
            </div>

            <div className="browse-job-filter-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              <label className="field" htmlFor="browse-job-search" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: "11px" }}>Search</span>
                <input
                  id="browse-job-search"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search job title or company"
                  value={searchTerm}
                  style={{ fontSize: "13px", padding: "8px 12px", minHeight: "36px" }}
                />
              </label>

              <label className="field" htmlFor="browse-job-sort" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: "11px" }}>Sort</span>
                <select
                  className="field-select"
                  id="browse-job-sort"
                  onChange={(event) => setSortValue(event.target.value as SortValue)}
                  value={sortValue}
                  style={{ fontSize: "13px", padding: "8px 12px", minHeight: "36px" }}
                >
                  <option value="newest">Newest</option>
                  <option value="budget-desc">Highest wages</option>
                  <option value="budget-asc">Lowest wages</option>
                </select>
              </label>

              <label className="field" htmlFor="browse-job-min-budget" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: "11px" }}>Min wages</span>
                <input
                  id="browse-job-min-budget"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setMinBudget(event.target.value)}
                  placeholder="0"
                  type="number"
                  value={minBudget}
                  style={{ fontSize: "13px", padding: "8px 12px", minHeight: "36px" }}
                />
              </label>

              <label className="field" htmlFor="browse-job-max-budget" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: "11px" }}>Max wages</span>
                <input
                  id="browse-job-max-budget"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setMaxBudget(event.target.value)}
                  placeholder="No limit"
                  type="number"
                  value={maxBudget}
                  style={{ fontSize: "13px", padding: "8px 12px", minHeight: "36px" }}
                />
              </label>
            </div>
          </section>

          <section aria-label="Browse job results" className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="browse-job-section-label">Open jobs</p>
                <h2 className="browse-job-section-title">Currently applyable jobs</h2>
              </div>
              <p className="browse-job-result-count">
                {filteredJobs.length} of {state.jobs.length} job(s)
              </p>
            </div>

            {state.jobs.length === 0 ? (
              <p className="browse-job-supporting-copy">No open jobs available right now.</p>
            ) : null}

            {state.jobs.length > 0 && filteredJobs.length === 0 ? (
              <p className="browse-job-supporting-copy">No jobs match your current filters.</p>
            ) : null}

            {filteredJobs.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                {filteredJobs.map((job) => {
                  const application = applicationByJobId.get(job.id);
                  const isApplied = Boolean(application);

                  return (
                    <article className="status-panel browse-job-card" key={job.id} style={{ display: "flex", flexDirection: "column", padding: "16px", borderRadius: "12px" }}>
                      <div className="list-card-header" style={{ marginBottom: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <p className="browse-job-company" style={{ fontSize: "12px", margin: "0 0 4px 0" }}>{job.companyName}</p>
                          <h3 className="browse-job-card-title" style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 4px 0", lineHeight: 1.3 }}>{job.title}</h3>
                          <p className="browse-job-card-meta" style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
                            {job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : "Published recently"}
                          </p>
                        </div>

                        {isApplied ? (
                          <span
                            className="browse-job-application-status"
                            data-status={application?.status}
                            style={{ fontSize: "11px", whiteSpace: "nowrap", marginLeft: "12px" }}
                          >
                            Application {toSentenceCase(application!.status)}
                          </span>
                        ) : (
                          <span className="browse-job-open-status" style={{ fontSize: "11px", whiteSpace: "nowrap", marginLeft: "12px" }}>Open now</span>
                        )}
                      </div>

                      {job.description && (
                        <div className="browse-job-description-wrapper" style={{ marginBottom: "12px" }}>
                          <p className="browse-job-description" style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.5, margin: 0 }}>
                            {expandedDescriptions.has(job.id)
                              ? job.description
                              : job.description.length > 100
                                ? `${job.description.substring(0, 100)}...`
                                : job.description}
                            {job.description.length > 100 && (
                              <button
                                className="browse-job-description-toggle"
                                type="button"
                                onClick={() => {
                                  setExpandedDescriptions(prev => {
                                    const next = new Set(prev);
                                    if (next.has(job.id)) {
                                      next.delete(job.id);
                                    } else {
                                      next.add(job.id);
                                    }
                                    return next;
                                  });
                                }}
                                style={{ fontSize: "11px", fontWeight: 600, color: "#0F6E56", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", marginLeft: "4px" }}
                              >
                                {expandedDescriptions.has(job.id) ? "less" : "more"}
                              </button>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="browse-job-meta" style={{ display: "flex", gap: "16px", fontSize: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #E5E7EB" }}>
                        <p style={{ margin: 0 }}>
                          <span className="browse-job-meta-label" style={{ color: "#9CA3AF", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Wages</span>
                          <strong className="browse-job-meta-value dashboard-mono" style={{ fontSize: "14px", fontFamily: "'DM Mono', monospace" }}>{formatCurrency(job.budget)}</strong>
                        </p>
                        <p style={{ margin: 0 }}>
                          <span className="browse-job-meta-label" style={{ color: "#9CA3AF", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Milestones</span>
                          <strong className="browse-job-meta-value" style={{ fontSize: "14px" }}>{job.milestoneCount}</strong>
                        </p>
                        {application ? (
                          <p style={{ margin: 0 }}>
                            <span className="browse-job-meta-label" style={{ color: "#9CA3AF", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Applied</span>
                            <strong className="browse-job-meta-value" style={{ fontSize: "14px" }}>{formatDate(application.appliedAt)}</strong>
                          </p>
                        ) : null}
                      </div>

                      <p className="browse-job-supporting-copy" style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px", margin: 0 }}>
                        {application
                          ? `Your application status is ${toSentenceCase(application.status)}.`
                          : "Apply to this job."}
                      </p>

                      <div className="action-row" style={{ marginTop: "auto" }}>
                        <button
                          className="button-primary"
                          disabled={isApplied || applyingJobId !== null}
                          onClick={() => handleApply(job.id)}
                          type="button"
                          style={{ width: "100%", fontSize: "13px", padding: "10px" }}
                        >
                          {applyingJobId === job.id
                            ? "Applying..."
                            : isApplied
                              ? "Already applied"
                              : "Apply"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
