"use client";

import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";
import { FreelancerActiveWorkStats, ActiveWorkStats } from "./freelancer-active-work-stats";
import { FreelancerActiveJobCard, ActiveWorkJobCard } from "./freelancer-active-job-card";
import { MilestoneTimelineItem } from "./freelancer-milestone-timeline";

export const FreelancerActiveJobsPage = () => {
  const session = useProtectedUser("freelancer");
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof freelancerWorkspaceApi.listJobs>>["jobs"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await freelancerWorkspaceApi.listJobs();
        setJobs(response.jobs);
      } catch (loadError) {
        setError(loadError instanceof ApiRequestError ? loadError.message : "Unable to load active jobs.");
      }
    };

    void load();
  }, [session.status]);

  if (session.status !== "ready") {
    return null;
  }

  // Calculate stats based on available data
  const totalJobs = jobs.length;
  const allMilestones = jobs.flatMap(j => j.milestones);
  
  // TODO: Get actual amounts from API when available
  const estimatedTotalAmount = totalJobs * 5000; // Placeholder
  const earnedSoFar = allMilestones
    .filter(m => m.status === "RELEASED" || m.status === "APPROVED").length * 1500; // Placeholder
  const inEscrow = estimatedTotalAmount - earnedSoFar;
  const pendingReview = allMilestones.filter(m => m.status === "SUBMITTED" || m.status === "UNDER_REVIEW").length;

  const stats: ActiveWorkStats = {
    activeJobs: totalJobs,
    earnedSoFar,
    totalContracted: estimatedTotalAmount,
    pendingReview,
    inEscrow
  };

  // Transform jobs to card format
  const jobCards: ActiveWorkJobCard[] = jobs.map(job => ({
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    category: "Development", // TODO: get from API
    totalAmount: 5000 * job.milestones.length, // Placeholder calculation
    escrowStatus: "FUNDED",
    milestones: job.milestones.map((m) => ({
      id: m.id,
      sequence: m.sequence,
      title: m.title,
      description: m.description,
      amount: 5000, // Placeholder amount - TODO: get from API
      dueAt: m.dueAt || "",
      status: m.status,
      revisions: {
        used: m.revisionCount,
        remaining: m.remainingRevisions,
        limit: 3
      }
    } as MilestoneTimelineItem))
  }));

  return (
    <WorkspaceLayout title="Active Work" subtitle="Track your milestones, submissions, and escrow releases." user={session.user}>
      {error ? <p className="form-error">{error}</p> : null}

      {/* Stats Dashboard */}
      <FreelancerActiveWorkStats stats={stats} />

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151",
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }}>
          Jobs & Milestones
        </p>
        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
          Click a milestone to expand details
        </span>
      </div>

      {/* Job Cards */}
      <div style={{ display: "grid", gap: "20px" }}>
        {jobCards.map(job => (
          <FreelancerActiveJobCard key={job.id} job={job} />
        ))}
      </div>
    </WorkspaceLayout>
  );
};
