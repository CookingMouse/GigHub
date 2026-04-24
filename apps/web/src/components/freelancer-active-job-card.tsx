"use client";

import React, { useState } from "react";
import { MilestoneTimeline, MilestoneTimelineItem } from "./freelancer-milestone-timeline";

export interface ActiveWorkJobCard {
  id: string;
  title: string;
  companyName: string;
  category?: string;
  totalAmount: number;
  milestones: MilestoneTimelineItem[];
  escrowStatus: string;
}

interface FreelancerActiveJobCardProps {
  job: ActiveWorkJobCard;
}

const ProgressBar = ({ completed, total }: { completed: number; total: number }) => {
  const percentage = (completed / total) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          flex: 1,
          height: "6px",
          backgroundColor: "#F3F4F6",
          borderRadius: "999px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: "#0F6E56",
            borderRadius: "999px",
            transition: "width 0.4s ease"
          }}
        />
      </div>
      <span
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#6B7280",
          fontFamily: "'DM Mono', monospace",
          whiteSpace: "nowrap"
        }}
      >
        {completed}/{total}
      </span>
    </div>
  );
};

export const FreelancerActiveJobCard = ({ job }: FreelancerActiveJobCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const completedMilestones = job.milestones.filter(m => m.status === "RELEASED" || m.status === "APPROVED").length;
  const earnedAmount = job.milestones
    .filter(m => m.status === "RELEASED" || m.status === "APPROVED")
    .reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="active-job-card">
      {/* Job header - clickable to expand/collapse */}
      <div
        className="active-job-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer" }}
      >
        {/* Icon/category */}
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            backgroundColor: "#E1F5EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "18px"
          }}
        >
          {job.category === "Design" ? "🎨" : "💻"}
        </div>

        {/* Title and company */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: 0 }}>
              {job.title}
            </p>
            {job.category && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "#E1F5EE",
                  color: "#085041"
                }}
              >
                {job.category}
              </span>
            )}
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 8px" }}>
            {job.companyName}
          </p>
          <ProgressBar completed={completedMilestones} total={job.milestones.length} />
        </div>

        {/* Amount summary */}
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: "12px" }}>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 2px", fontFamily: "'DM Mono', monospace" }}>
            RM {earnedAmount.toLocaleString()}
            <span style={{ fontSize: "12px", fontWeight: "400", color: "#9CA3AF" }}>
              {" "}/ {job.totalAmount.toLocaleString()}
            </span>
          </p>
          <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
            Escrow: <span style={{ color: "#0F6E56", fontWeight: "600" }}>FUNDED</span>
          </p>
        </div>

        {/* Chevron */}
        <div
          style={{
            fontSize: "14px",
            color: "#9CA3AF",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(90deg)" : "none"
          }}
        >
          ▶
        </div>
      </div>

      {/* Expanded content - milestones */}
      {isOpen && (
        <div className="active-job-milestones">
          <MilestoneTimeline milestones={job.milestones} jobId={job.id} />
        </div>
      )}
    </div>
  );
};
