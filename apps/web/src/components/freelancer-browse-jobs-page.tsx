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
                <p className="eyebrow">Browse controls</p>
                <h2>Search, sort, and filter</h2>
              </div>
              <button className="button-secondary" onClick={clearFilters} type="button">
                Clear filters
              </button>
            </div>

            <div className="browse-job-filter-grid">
              <label className="field" htmlFor="browse-job-search">
                <span>Search</span>
                <input
                  id="browse-job-search"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search job title or company"
                  value={searchTerm}
                />
              </label>

              <label className="field" htmlFor="browse-job-sort">
                <span>Sort</span>
                <select
                  className="field-select"
                  id="browse-job-sort"
                  onChange={(event) => setSortValue(event.target.value as SortValue)}
                  value={sortValue}
                >
                  <option value="newest">Newest</option>
                  <option value="budget-desc">Highest budget</option>
                  <option value="budget-asc">Lowest budget</option>
                </select>
              </label>

              <label className="field" htmlFor="browse-job-min-budget">
                <span>Min budget</span>
                <input
                  id="browse-job-min-budget"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setMinBudget(event.target.value)}
                  placeholder="0"
                  type="number"
                  value={minBudget}
                />
              </label>

              <label className="field" htmlFor="browse-job-max-budget">
                <span>Max budget</span>
                <input
                  id="browse-job-max-budget"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setMaxBudget(event.target.value)}
                  placeholder="No limit"
                  type="number"
                  value={maxBudget}
                />
              </label>
            </div>
          </section>

          <section aria-label="Browse job results" className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">Open jobs</p>
                <h2>Currently applyable jobs</h2>
              </div>
              <p className="helper-copy">
                {filteredJobs.length} of {state.jobs.length} job(s)
              </p>
            </div>

            {state.jobs.length === 0 ? (
              <p className="muted">No open jobs available right now.</p>
            ) : null}

            {state.jobs.length > 0 && filteredJobs.length === 0 ? (
              <p className="muted">No jobs match your current filters.</p>
            ) : null}

            {filteredJobs.length > 0 ? (
              <div className="card-stack">
                {filteredJobs.map((job) => {
                  const application = applicationByJobId.get(job.id);
                  const isApplied = Boolean(application);

                  return (
                    <article className="status-panel browse-job-card" key={job.id}>
                      <div className="list-card-header">
                        <div>
                          <p className="eyebrow">{job.companyName}</p>
                          <h3 className="browse-job-card-title">{job.title}</h3>
                          <p className="muted">
                            {job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : "Published recently"}
                          </p>
                        </div>

                        {isApplied ? (
                          <span
                            className="browse-job-application-status"
                            data-status={application?.status}
                          >
                            Application {toSentenceCase(application!.status)}
                          </span>
                        ) : (
                          <span className="status-chip">Open now</span>
                        )}
                      </div>

                      <div className="browse-job-meta">
                        <p>
                          <span className="panel-label">Budget</span>
                          <strong>{formatCurrency(job.budget)}</strong>
                        </p>
                        <p>
                          <span className="panel-label">Milestones</span>
                          <strong>{job.milestoneCount}</strong>
                        </p>
                        {application ? (
                          <p>
                            <span className="panel-label">Applied</span>
                            <strong>{formatDate(application.appliedAt)}</strong>
                          </p>
                        ) : null}
                      </div>

                      <p className="helper-copy">
                        {application
                          ? `Your current application status is ${toSentenceCase(application.status)}.`
                          : "Apply directly from this browse page."}
                      </p>

                      <div className="action-row">
                        <button
                          className="button-primary"
                          disabled={isApplied || applyingJobId !== null}
                          onClick={() => handleApply(job.id)}
                          type="button"
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
