"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  milestoneStatusConfig,
  calculateTimeRemaining,
  formatDate,
  isMilestoneLocked
} from "@/lib/milestone-utils";

export interface MilestoneTimelineItem {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  amount?: number | null;
  dueAt: string | null;
  status: string;
  revisions?: {
    used: number;
    remaining: number;
    limit: number;
  };
  submission?: {
    fileName?: string;
    submittedAt: string;
    fileHash: string;
    revisionNumber: number;
  };
  rejection?: {
    reason: string;
    rejectedAt: string;
  };
}

interface MilestoneTimelineProps {
  milestones: MilestoneTimelineItem[];
}

const MilestoneStatus = ({ status }: { status: string }) => {
  const config = milestoneStatusConfig[status as keyof typeof milestoneStatusConfig];
  if (!config) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.75rem",
        fontWeight: "700",
        padding: "4px 10px",
        borderRadius: "999px",
        backgroundColor: config.backgroundColor,
        color: config.color,
        textTransform: "uppercase"
      }}
    >
      {config.icon} {config.label}
    </span>
  );
};

export const MilestoneTimeline = ({ milestones }: MilestoneTimelineProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(milestones[0]?.id);
  const locked = (m: MilestoneTimelineItem) => isMilestoneLocked(m.status as any);

  return (
    <div className="milestone-timeline">
      {milestones.map((m, idx) => {
        const isLast = idx === milestones.length - 1;
        const isLocked = locked(m);
        const isExpanded = expandedId === m.id;
        const config = milestoneStatusConfig[m.status as keyof typeof milestoneStatusConfig];

        const timeInfo = (m.status === "SUBMITTED" || m.status === "UNDER_REVIEW") && m.submission
          ? calculateTimeRemaining(m.submission.submittedAt)
          : null;

        return (
          <div key={m.id} className="milestone-row">
            <div className="milestone-spine">
              <div
                className="milestone-node"
                style={{
                  backgroundColor: config?.backgroundColor,
                  borderColor: config?.color,
                  opacity: isLocked ? 0.6 : 1
                }}
              >
                <span style={{ fontSize: "14px" }}>{config?.icon}</span>
              </div>
              {!isLast && <div className="spine-connector" />}
            </div>

            <div
              className={`milestone-card ${isExpanded ? "expanded" : ""} ${isLocked ? "locked" : ""}`}
              onClick={() => !isLocked && setExpandedId(isExpanded ? null : m.id)}
            >
              <div className="milestone-card-header">
                <div className="milestone-card-title-section">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "#9CA3AF",
                        fontFamily: "'DM Mono', monospace"
                      }}
                    >
                      M{m.sequence}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>{m.title}</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "#6B7280" }}>
                    <span>📅 Due {formatDate(m.dueAt)}</span>
                    {m.submission && (
                      <span>📄 Rev {m.submission.revisionNumber}</span>
                    )}
                  </div>
                </div>

                {m.amount !== null && m.amount !== undefined ? (
                  <div className="milestone-card-amount-section">
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "15px", fontWeight: "700", margin: 0, fontFamily: "'DM Mono', monospace" }}>
                        RM {m.amount.toLocaleString()}
                      </p>
                      <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "2px 0 0" }}>
                        {m.status === "RELEASED" ? "Released ✓" : "In escrow"}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="milestone-card-status-section">
                  <MilestoneStatus status={m.status} />
                </div>

                {!isLocked && (
                  <div style={{ fontSize: "14px", color: "#9CA3AF", transition: "transform 0.15s" }}>
                    {isExpanded ? "▼" : "▶"}
                  </div>
                )}
              </div>

              {isExpanded && !isLocked && (
                <div className="milestone-card-details">
                  {(m.status === "SUBMITTED" || m.status === "UNDER_REVIEW") && m.submission && (
                    <div className="detail-section" style={{ backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#1D4ED8", textTransform: "uppercase" }}>
                            ⏳ Awaiting Company Review
                          </p>
                          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#1e40af" }}>
                            {timeInfo
                              ? `Auto-release: ${timeInfo.expiresAt.toLocaleString("en-MY")}`
                              : "Auto-release timing is based on the latest submission window."}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#3B82F6" }}>
                            {timeInfo ? `${timeInfo.formattedTime} remaining` : "Review window in progress"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "#1e40af", fontFamily: "'DM Mono', monospace" }}>
                            {m.submission.fileHash}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#1D4ED8" }}>
                            Submitted {formatDate(m.submission.submittedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {m.rejection && m.status === "REVISION_REQUESTED" && (
                    <div className="detail-section" style={{ backgroundColor: "#FEF3C7", borderColor: "#FBBF24" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#B45309", textTransform: "uppercase" }}>
                        ✏️ Revision Requested
                      </p>
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#B45309" }}>
                        {m.rejection.reason}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#92400e" }}>
                        Rejected {formatDate(m.rejection.rejectedAt)}
                      </p>
                    </div>
                  )}

                  {m.status === "RELEASED" && (
                    <div className="detail-section" style={{ backgroundColor: "#E1F5EE", borderColor: "#10B981" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#0F6E56", textTransform: "uppercase" }}>
                        ✅ Payment Released
                      </p>
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#085041" }}>
                        {m.amount !== null && m.amount !== undefined
                          ? `RM ${m.amount.toLocaleString()} transferred to your wallet`
                          : "This milestone has been approved and released in the workflow."}
                      </p>
                    </div>
                  )}

                  {m.status === "IN_PROGRESS" && (
                    <Link
                      href={`/freelancer/milestones/${m.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#0F6E56",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        textDecoration: "none",
                        marginTop: "12px"
                      }}
                    >
                      📤 Upload Deliverable
                    </Link>
                  )}

                  {m.status === "REVISION_REQUESTED" && (
                    <Link
                      href={`/freelancer/milestones/${m.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#B45309",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        textDecoration: "none",
                        marginTop: "12px"
                      }}
                    >
                      ✏️ Submit Revision
                    </Link>
                  )}
                </div>
              )}

              {isLocked && (
                <div style={{ padding: "12px 0", opacity: 0.6 }}>
                  {m.status === "PENDING" ? (
                    <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                      🔒 Unlocks after previous milestone is approved
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                      This milestone is locked
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
