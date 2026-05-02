"use client";

import type { JobApplicationRecord, JobAvailabilityRecord, JobMatchRecord } from "@gighub/shared";
import Link from "next/link";
import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type BrowseState =
  | { status: "loading" }
  | { status: "ready"; jobs: JobAvailabilityRecord[]; applications: JobApplicationRecord[] }
  | { status: "error"; message: string };

type SortValue = "newest" | "budget-desc" | "budget-asc";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(value));

const getPublishedTimestamp = (value: string | null) => (value ? new Date(value).getTime() : 0);

const parseBudget = (value: string) => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toSentenceCase = (value: string) =>
  value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const formatRequestError = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "The running API process does not include the request routes yet. Restart API (npm run dev) and retry.";
  }
  return error instanceof ApiRequestError ? error.message : fallback;
};

const accent = "#0F6E56";
const accentLight = "#E1F5EE";

const MatchBadge = ({ score }: { score: number }) => {
  const bg = score >= 70 ? "#0F6E56" : score >= 40 ? "#B45309" : "#6B7280";
  return (
    <span style={{
      position: "absolute", top: 14, right: 16,
      fontSize: 10, fontWeight: 700, color: "#fff",
      background: bg, borderRadius: 999,
      padding: "2px 8px", letterSpacing: "0.04em",
      pointerEvents: "none"
    }}>
      {score}% match
    </span>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    ACCEPTED:  { bg: "#E1F5EE", color: "#0F6E56" },
    REJECTED:  { bg: "#FEF2F2", color: "#DC2626" },
    PENDING:   { bg: "#FEF3C7", color: "#B45309" },
    OPEN:      { bg: "#E1F5EE", color: "#0F6E56" },
  };
  const style = map[status] ?? { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      padding: "3px 12px", borderRadius: 999,
      background: style.bg, color: style.color,
      letterSpacing: "0.03em"
    }}>
      {toSentenceCase(status)}
    </span>
  );
};

export const FreelancerBrowseJobsPage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<BrowseState>({ status: "loading" });
  const [matchScores, setMatchScores] = useState<Map<string, number>>(new Map());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortValue, setSortValue] = useState<SortValue>("newest");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const reload = async () => {
    try {
      const [availability, requests] = await Promise.all([
        requestsApi.listAvailability(),
        requestsApi.listFreelancerRequests()
      ]);
      setState({ status: "ready", jobs: availability.jobs, applications: requests.applications });
    } catch (err) {
      setState({ status: "error", message: formatRequestError(err, "Unable to load jobs right now.") });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void reload();
      freelancerWorkspaceApi.listJobMatches()
        .then(r => setMatchScores(new Map(r.matches.map((m: JobMatchRecord) => [m.jobId, m.matchScore]))))
        .catch(() => {});
    }
  }, [session.status]);

  const applicationByJobId = useMemo(() => {
    if (state.status !== "ready") return new Map<string, JobApplicationRecord>();
    return new Map(state.applications.map((a) => [a.jobId, a]));
  }, [state]);

  const filteredJobs = useMemo(() => {
    if (state.status !== "ready") return [];
    const query = deferredSearch.trim().toLowerCase();
    const minB = parseBudget(minBudget);
    const maxB = parseBudget(maxBudget);

    const jobs = state.jobs.filter((job) => {
      const matchesQuery = query.length === 0 || `${job.title} ${job.companyName}`.toLowerCase().includes(query);
      const matchesMin = minB === null || job.budget >= minB;
      const matchesMax = maxB === null || job.budget <= maxB;
      return matchesQuery && matchesMin && matchesMax;
    });

    return jobs.sort((a, b) => {
      if (query.length > 0) {
        const aTitle = a.title.toLowerCase().startsWith(query);
        const bTitle = b.title.toLowerCase().startsWith(query);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
      }
      if (sortValue === "budget-desc") return b.budget - a.budget;
      if (sortValue === "budget-asc") return a.budget - b.budget;
      return getPublishedTimestamp(b.publishedAt) - getPublishedTimestamp(a.publishedAt);
    });
  }, [deferredSearch, minBudget, maxBudget, sortValue, state]);

  if (session.status !== "ready") return null;

  const handleApply = (jobId: string) => {
    setApplyError(null);
    setApplyingJobId(jobId);
    startTransition(async () => {
      try {
        await requestsApi.applyToJob(jobId, { coverNote: "" });
        await reload();
      } catch (err) {
        setApplyError(formatRequestError(err, "Unable to apply right now."));
      } finally {
        setApplyingJobId(null);
      }
    });
  };

  const hasActiveFilters = searchTerm || minBudget || maxBudget || sortValue !== "newest";

  const clearFilters = () => {
    setSearchTerm("");
    setSortValue("newest");
    setMinBudget("");
    setMaxBudget("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "11px 14px", fontSize: 14,
    border: "1.5px solid #E5E7EB", borderRadius: 10,
    background: "#fff", color: "#111827",
    fontFamily: "inherit", outline: "none",
    transition: "border-color 150ms",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#6B7280", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.06em",
  };

  return (
    <WorkspaceLayout
      title="Browse Jobs"
      subtitle="Discover open roles and apply in one click."
      user={session.user}
    >
      {applyError ? <p className="form-error" style={{ marginBottom: 20 }}>{applyError}</p> : null}

      {state.status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 140, borderRadius: 16, background: "#F3F4F6", animation: "freelancer-shimmer 1.5s infinite linear", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)" }} />
          ))}
        </div>
      )}

      {state.status === "error" && <p className="form-error">{state.message}</p>}

      {state.status === "ready" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, alignItems: "start" }}>

          {/* ── Filter sidebar ── */}
          <aside style={{
            position: "sticky", top: 0,
            background: "#fff", border: "1.5px solid #E5E7EB",
            borderRadius: 18, padding: "24px 22px",
            display: "flex", flexDirection: "column", gap: 24,
          }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter & Sort</p>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>Find your job</h2>
            </div>

            {/* Search */}
            <div>
              <label style={labelStyle} htmlFor="bj-search">Search</label>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
                </svg>
                <input
                  id="bj-search"
                  placeholder="Title or company name…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label style={labelStyle} htmlFor="bj-sort">Sort by</label>
              <select
                id="bj-sort"
                value={sortValue}
                onChange={e => setSortValue(e.target.value as SortValue)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
              >
                <option value="newest">Newest first</option>
                <option value="budget-desc">Highest budget</option>
                <option value="budget-asc">Lowest budget</option>
              </select>
            </div>

            {/* Budget range */}
            <div>
              <label style={labelStyle}>Budget range (MYR)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Min</p>
                  <input
                    id="bj-min"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    type="number"
                    value={minBudget}
                    onChange={e => setMinBudget(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Max</p>
                  <input
                    id="bj-max"
                    inputMode="numeric"
                    min="0"
                    placeholder="Any"
                    type="number"
                    value={maxBudget}
                    onChange={e => setMaxBudget(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  border: "1.5px solid #E5E7EB", background: "#F9FAFB",
                  fontSize: 13, fontWeight: 600, color: "#6B7280",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Clear all filters
              </button>
            )}
          </aside>

          {/* ── Job feed ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* Feed header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {searchTerm ? `Results for "${searchTerm}"` : "Open Positions"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9CA3AF" }}>
                  {filteredJobs.length} of {state.jobs.length} job{state.jobs.length !== 1 ? "s" : ""} shown
                </p>
              </div>
            </div>

            {/* Empty states */}
            {state.jobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 18, border: "1.5px dashed #E5E7EB" }}>
                <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "#374151" }}>No open jobs right now</p>
                <p style={{ margin: 0, fontSize: 14, color: "#9CA3AF" }}>Check back soon — new roles are added regularly.</p>
              </div>
            )}

            {state.jobs.length > 0 && filteredJobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 18, border: "1.5px dashed #E5E7EB" }}>
                <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "#374151" }}>No jobs match your filters</p>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#9CA3AF" }}>Try adjusting your search or budget range.</p>
                <button type="button" onClick={clearFilters} style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear filters
                </button>
              </div>
            )}

            {/* Job cards */}
            {filteredJobs.map((job) => {
              const application = applicationByJobId.get(job.id);
              const isApplied = Boolean(application);
              const isExpanded = expandedId === job.id;

              return (
                <article
                  key={job.id}
                  style={{
                    position: "relative",
                    background: "#fff",
                    border: `1.5px solid ${isExpanded ? accent : "#E5E7EB"}`,
                    borderRadius: 18,
                    padding: "28px 30px",
                    boxShadow: isExpanded ? `0 0 0 4px ${accentLight}` : "0 1px 4px rgba(0,0,0,0.04)",
                    transition: "border-color 150ms, box-shadow 150ms",
                  }}
                >
                  {matchScores.has(job.id) && <MatchBadge score={matchScores.get(job.id)!} />}
                  {/* Top row: company + status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {/* Company avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: accentLight, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, fontWeight: 700, color: accent,
                    }}>
                      {job.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#6B7280" }}>{job.companyName}</p>
                      {job.publishedAt && (
                        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Posted {formatDate(job.publishedAt)}</p>
                      )}
                    </div>
                    <StatusPill status={isApplied ? (application?.status ?? "PENDING") : "OPEN"} />
                  </div>

                  {/* Job title */}
                  <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1.25 }}>
                    {job.title}
                  </h3>

                  {/* Description */}
                  {job.description && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ margin: 0, fontSize: 14, color: "#4B5563", lineHeight: 1.7 }}>
                        {isExpanded || job.description.length <= 180
                          ? job.description
                          : `${job.description.substring(0, 180)}…`}
                      </p>
                      {job.description.length > 180 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : job.id)}
                          style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height: 1, background: "#F3F4F6", margin: "0 0 20px" }} />

                  {/* Stats + action */}
                  <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    {/* Budget */}
                    <div>
                      <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>Budget</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" }}>
                        {formatCurrency(job.budget)}
                      </p>
                    </div>

                    {/* Milestones */}
                    <div>
                      <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>Milestones</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{job.milestoneCount}</p>
                    </div>

                    {/* Applied date if applicable */}
                    {application && (
                      <div>
                        <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>Applied on</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>{formatDate(application.appliedAt)}</p>
                      </div>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* View Details button */}
                    <Link
                      href={`/freelancer/browse-jobs/${job.id}`}
                      style={{
                        padding: "12px 28px", borderRadius: 12, border: "none",
                        fontSize: 14, fontWeight: 700, cursor: "pointer",
                        fontFamily: "inherit", letterSpacing: "-0.1px",
                        background: accent,
                        color: "#fff",
                        textDecoration: "none",
                        transition: "background 150ms, opacity 150ms",
                      }}
                    >
                      View Job Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
