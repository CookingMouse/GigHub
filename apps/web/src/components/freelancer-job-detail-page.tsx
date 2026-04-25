"use client";

import type { JobAvailabilityDetailRecord } from "@gighub/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, requestsApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; job: JobAvailabilityDetailRecord }
  | { status: "error"; message: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium"
  }).format(new Date(value));
};

export const FreelancerJobDetailPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (session.status !== "ready") return;

    let isMounted = true;
    const loadJob = async () => {
      try {
        const response = await requestsApi.getJobAvailability(jobId);
        if (!isMounted) return;
        setState({ status: "ready", job: response.job });
      } catch (error) {
        if (!isMounted) return;
        setState({
          status: "error",
          message: error instanceof ApiRequestError ? error.message : "Unable to load job details."
        });
      }
    };

    void loadJob();
    return () => { isMounted = false; };
  }, [jobId, session.status]);

  if (session.status !== "ready") return null;

  const handleApply = () => {
    setApplyError(null);
    setIsApplying(true);
    startTransition(async () => {
      try {
        await requestsApi.applyToJob(jobId, { coverNote: "" });
        setApplied(true);
      } catch (err) {
        setApplyError(err instanceof ApiRequestError ? err.message : "Unable to apply right now.");
      } finally {
        setIsApplying(false);
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Job Details"
      subtitle="Review the job scope and company profile before applying."
      user={session.user}
    >
      <div style={{ marginBottom: 20 }}>
        <Link className="button-secondary" href="/freelancer/requests">
          &larr; Back to Requests
        </Link>
      </div>

      {state.status === "loading" ? <p className="muted">Loading job details...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {state.status === "ready" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Main Job Info */}
            <section className="inline-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h1 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 800, color: "#111827" }}>
                    {state.job.title}
                  </h1>
                  <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>
                    Posted {formatDate(state.job.publishedAt)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Wage</p>
                  <strong style={{ fontSize: 24, color: "#0F6E56" }}>{formatCurrency(state.job.budget)}</strong>
                </div>
              </div>

              {state.job.description ? (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700, color: "#374151" }}>Description</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "#4B5563", lineHeight: 1.6 }}>{state.job.description}</p>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 32, padding: "16px 20px", backgroundColor: "#F9FAFB", borderRadius: 12 }}>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Milestones</p>
                  <strong style={{ fontSize: 16, color: "#111827" }}>{state.job.milestoneCount}</strong>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Industry</p>
                  <strong style={{ fontSize: 16, color: "#111827" }}>{state.job.company.industry || "Not specified"}</strong>
                </div>
              </div>
            </section>

            {/* Scope & Brief */}
            <section className="inline-panel">
              <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>Job Scope & Requirements</h2>
              
              {state.job.brief.overview ? (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Overview</h3>
                  <p style={{ margin: 0, fontSize: 14, color: "#4B5563", lineHeight: 1.6 }}>{state.job.brief.overview}</p>
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Deliverables</h3>
                  {state.job.brief.deliverables.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#4B5563" }}>
                      {state.job.brief.deliverables.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
                    </ul>
                  ) : <p className="muted">None specified.</p>}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>Acceptance Criteria</h3>
                  {state.job.brief.acceptanceCriteria.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#4B5563" }}>
                      {state.job.brief.acceptanceCriteria.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
                    </ul>
                  ) : <p className="muted">None specified.</p>}
                </div>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <section className="inline-panel" style={{ position: "sticky", top: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700 }}>{state.job.company.name}</h3>
                {state.job.company.website ? (
                  <a href={state.job.company.website} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0F6E56", textDecoration: "none" }}>
                    Visit Website &rarr;
                  </a>
                ) : null}
              </div>

              {state.job.company.about ? (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: "0 0 6px 0", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>About the company</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#4B5563", lineHeight: 1.5 }}>
                    {state.job.company.about}
                  </p>
                </div>
              ) : null}

              {applyError ? <p className="form-error" style={{ marginBottom: 16 }}>{applyError}</p> : null}

              <button
                className="button-primary"
                style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 700 }}
                onClick={handleApply}
                disabled={isApplying || applied}
              >
                {isApplying ? "Applying..." : applied ? "Application Sent!" : "Apply Now"}
              </button>
            </section>
          </div>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
