"use client";

import React from "react";

export interface ActiveWorkStats {
  activeJobs: number;
  totalMilestones: number;
  readyToSubmit: number;
  pendingReview: number;
  dueThisWeek: number;
}

interface FreelancerActiveWorkStatsProps {
  stats: ActiveWorkStats;
}

const StatCard = ({
  label,
  value,
  subtext,
  isPositive
}: {
  label: string;
  value: string | number;
  subtext: string;
  isPositive?: boolean;
}) => (
  <div
    style={{
      border: "1px solid #E5E7EB",
      borderRadius: "14px",
      backgroundColor: "#fff",
      padding: "18px 20px"
    }}
  >
    <p
      style={{
        fontSize: "12px",
        color: "#9CA3AF",
        margin: "0 0 6px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}
    >
      {label}
    </p>
    <p
      style={{
        fontSize: "22px",
        fontWeight: "600",
        color: "#111827",
        margin: "0 0 4px",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "-0.5px"
      }}
    >
      {value}
    </p>
    <p
      style={{
        fontSize: "12px",
        color: isPositive === true ? "#0F6E56" : "#6B7280",
        margin: 0,
        fontWeight: "500"
      }}
    >
      {subtext}
    </p>
  </div>
);

export const FreelancerActiveWorkStats = ({ stats }: FreelancerActiveWorkStatsProps) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "16px",
        marginBottom: "28px"
      }}
    >
      <StatCard
        label="Active Jobs"
        value={stats.activeJobs}
        subtext={`${stats.totalMilestones} milestone(s) currently tracked`}
      />
      <StatCard
        label="Ready to Submit"
        value={stats.readyToSubmit}
        subtext={
          stats.readyToSubmit > 0
            ? "In progress or revision-ready milestones"
            : "No milestone waiting for upload"
        }
        isPositive={stats.readyToSubmit > 0}
      />
      <StatCard
        label="Pending Review"
        value={stats.pendingReview}
        subtext={stats.pendingReview > 0 ? "Awaiting client approval" : "All clear"}
        isPositive={stats.pendingReview === 0}
      />
      <StatCard
        label="Due This Week"
        value={stats.dueThisWeek}
        subtext={
          stats.dueThisWeek > 0
            ? "Upcoming delivery windows to watch"
            : "No milestone deadlines in the next 7 days"
        }
      />
    </div>
  );
};
