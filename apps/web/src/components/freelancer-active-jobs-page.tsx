"use client";

import React, { useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";
import { FreelancerActiveWorkStats, ActiveWorkStats } from "./freelancer-active-work-stats";
import { FreelancerActiveJobCard, ActiveWorkJobCard } from "./freelancer-active-job-card";
import { MilestoneTimelineItem } from "./freelancer-milestone-timeline";

const completedMilestoneStatuses = new Set(["APPROVED", "RELEASED"]);
const readyForSubmissionStatuses = new Set(["IN_PROGRESS", "REVISION_REQUESTED"]);
const reviewStatuses = new Set(["SUBMITTED", "UNDER_REVIEW"]);
const millisecondsPerDay = 86_400_000;

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

  const activeJobs = jobs.filter((job) => job.status !== "COMPLETED");
  const totalJobs = activeJobs.length;
  const allMilestones = activeJobs.flatMap((job) => job.milestones);
  const readyToSubmit = allMilestones.filter((milestone) =>
    readyForSubmissionStatuses.has(milestone.status)
  ).length;
  const pendingReview = allMilestones.filter((milestone) => reviewStatuses.has(milestone.status)).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueThisWeek = allMilestones.filter((milestone) => {
    if (!milestone.dueAt || completedMilestoneStatuses.has(milestone.status)) {
      return false;
    }

    const dueDate = new Date(milestone.dueAt);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / millisecondsPerDay);
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const stats: ActiveWorkStats = {
    activeJobs: totalJobs,
    totalMilestones: allMilestones.length,
    readyToSubmit,
    pendingReview,
    dueThisWeek
  };

  const jobCards: ActiveWorkJobCard[] = activeJobs.map(job => ({
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    milestones: job.milestones.map((m) => ({
      id: m.id,
      sequence: m.sequence,
      title: m.title,
      description: m.description,
      amount: null,
      dueAt: m.dueAt,
      status: m.status
    }))
  }));

  return (
    <WorkspaceLayout title="Active Work" subtitle="Track your milestones, submissions, and escrow releases." user={session.user}>
      {error ? <p className="form-error">{error}</p> : null}

      <FreelancerActiveWorkStats stats={stats} />

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

      <div style={{ display: "grid", gap: "20px" }}>
        {jobCards.length > 0 ? (
          jobCards.map(job => (
            <FreelancerActiveJobCard key={job.id} job={job} />
          ))
        ) : (
          <div className="inline-panel">
            <p className="eyebrow">Active work</p>
            <h2>No active jobs yet</h2>
            <p className="muted">Milestones will appear here once a company assigns work to you.</p>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
