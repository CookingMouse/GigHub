import { useState } from "react";

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  check:    "M20 6L9 17l-5-5",
  clock:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  alert:    "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  chevron:  "M9 18l6-6-6-6",
  brief:    "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  money:    "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  dispute:  "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  back:     "M19 12H5 M12 19l-7-7 7-7",
  glm:      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 12h8 M12 8v8",
};

// ── Shared design tokens ─────────────────────────────────────────────────────
const T = {
  accent:      "#0F6E56",
  accentLight: "#E1F5EE",
  accentText:  "#085041",
  border:      "#E5E7EB",
  bg:          "#F9FAFB",
  card:        "#fff",
  text:        "#111827",
  sub:         "#6B7280",
  muted:       "#9CA3AF",
  danger:      "#DC2626",
  warning:     "#B45309",
  info:        "#1D4ED8",
};

// ── Status config ────────────────────────────────────────────────────────────
const statusCfg = {
  RELEASED:       { label: "Released",       color: T.accent,   bg: T.accentLight },
  APPROVED:       { label: "Approved",       color: T.accent,   bg: T.accentLight },
  SUBMITTED:      { label: "Under Review",   color: T.info,     bg: "#EFF6FF"     },
  IN_PROGRESS:    { label: "In Progress",    color: T.warning,  bg: "#FEF3C7"     },
  PENDING:        { label: "Pending",        color: T.muted,    bg: "#F3F4F6"     },
  DISPUTED:       { label: "Disputed",       color: T.danger,   bg: "#FEF2F2"     },
};

const Badge = ({ status, size = 12 }) => {
  const s = statusCfg[status] || statusCfg.PENDING;
  return (
    <span style={{
      fontSize: size, fontWeight: 600, padding: "3px 10px",
      borderRadius: 99, background: s.bg, color: s.color,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
};

// ── GLM score ring ───────────────────────────────────────────────────────────
const GlmRing = ({ score }) => {
  if (score === null) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 32, height: 32, borderRadius: 99, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon d={icons.glm} size={14} />
      </div>
      <span style={{ fontSize: 11, color: T.muted }}>Not scored</span>
    </div>
  );
  const color = score >= 80 ? T.accent : score >= 60 ? T.warning : T.danger;
  const r = 13, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
          <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 18 18)" />
        </svg>
        <span style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color,
          fontFamily: "'DM Mono', monospace",
        }}>
          {score}
        </span>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color, margin: 0 }}>
          GLM Score
        </p>
        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>
          {score >= 80 ? "Strong match" : score >= 60 ? "Minor gaps" : "Review needed"}
        </p>
      </div>
    </div>
  );
};

// ── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, total, color = T.accent }) => {
  const pct = Math.round((value / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
        {value}/{total}
      </span>
    </div>
  );
};

// ── Mock data ────────────────────────────────────────────────────────────────
const jobs = [
  {
    id: "job-1",
    title: "UI Redesign — Dashboard & Components",
    company: "TechCorp Sdn Bhd",
    totalAmount: 4500,
    category: "Design",
    escrowStatus: "FUNDED",
    milestones: [
      {
        id: "m1", order: 1, title: "Wireframes & User Flow",
        amount: 1200, dueDate: "15 Apr 2026", status: "RELEASED",
        glmScore: 91,
        submission: { revisionNumber: 1, submittedAt: "13 Apr 2026", fileHash: "a1b2c3d4" },
        notes: "Delivered on time. GLM confirmed full brief coverage.",
      },
      {
        id: "m2", order: 2, title: "High-Fidelity Mockups",
        amount: 1800, dueDate: "28 Apr 2026", status: "SUBMITTED",
        glmScore: 74,
        submission: { revisionNumber: 1, submittedAt: "24 Apr 2026", fileHash: "e5f6g7h8" },
        notes: "GLM flagged 2 minor gaps: mobile breakpoint and dark mode variant missing.",
      },
      {
        id: "m3", order: 3, title: "Design System & Handoff",
        amount: 1500, dueDate: "10 May 2026", status: "PENDING",
        glmScore: null,
        submission: null,
        notes: "Unlocks after Milestone 2 is approved.",
      },
    ],
  },
  {
    id: "job-2",
    title: "API Integration — Payment Gateway",
    company: "StartX Technologies",
    totalAmount: 3200,
    category: "Development",
    escrowStatus: "FUNDED",
    milestones: [
      {
        id: "m4", order: 1, title: "Environment Setup & Auth",
        amount: 800, dueDate: "20 Apr 2026", status: "RELEASED",
        glmScore: 88,
        submission: { revisionNumber: 1, submittedAt: "19 Apr 2026", fileHash: "i9j0k1l2" },
        notes: "Clean setup. All auth endpoints verified.",
      },
      {
        id: "m5", order: 2, title: "Payment Flow Implementation",
        amount: 1600, dueDate: "30 Apr 2026", status: "IN_PROGRESS",
        glmScore: null,
        submission: null,
        notes: "In progress. Due in 6 days.",
      },
      {
        id: "m6", order: 3, title: "Testing & Documentation",
        amount: 800, dueDate: "8 May 2026", status: "PENDING",
        glmScore: null,
        submission: null,
        notes: "Locked until Milestone 2 is complete.",
      },
    ],
  },
];

// ── Milestone row ────────────────────────────────────────────────────────────
const MilestoneRow = ({ m, isLast, accent }) => {
  const [expanded, setExpanded] = useState(false);
  const locked = m.status === "PENDING";

  return (
    <div style={{ display: "flex", gap: 0 }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 99, flexShrink: 0,
          border: `2.5px solid ${locked ? T.border : m.status === "RELEASED" || m.status === "APPROVED" ? T.accent : m.status === "DISPUTED" ? T.danger : T.warning}`,
          background: m.status === "RELEASED" || m.status === "APPROVED" ? T.accent : m.status === "SUBMITTED" ? "#EFF6FF" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: m.status === "RELEASED" || m.status === "APPROVED" ? "#fff" : locked ? T.muted : T.warning,
        }}>
          {m.status === "RELEASED" || m.status === "APPROVED"
            ? <Icon d={icons.check} size={13} />
            : locked
            ? <Icon d={icons.lock} size={11} />
            : <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.order}</span>
          }
        </div>
        {!isLast && (
          <div style={{ flex: 1, width: 2, background: m.status === "RELEASED" || m.status === "APPROVED" ? T.accent + "40" : T.border, marginTop: 2 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginLeft: 14, marginBottom: isLast ? 0 : 16,
        border: `1px solid ${expanded ? T.accent : T.border}`,
        borderRadius: 14, background: locked ? "#FAFAFA" : "#fff",
        boxShadow: expanded ? `0 0 0 3px ${T.accentLight}` : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        opacity: locked ? 0.65 : 1,
      }}>
        {/* Card header */}
        <div
          onClick={() => !locked && setExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px", cursor: locked ? "default" : "pointer",
          }}
        >
          {/* Order + title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
                M{m.order}
              </span>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.title}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={icons.clock} size={12} />
                {m.dueDate}
              </span>
              {m.submission && (
                <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={icons.file} size={12} />
                  Rev {m.submission.revisionNumber} · {m.submission.submittedAt}
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, fontFamily: "'DM Mono', monospace" }}>
              RM {m.amount.toLocaleString()}
            </p>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
              {m.status === "RELEASED" ? "Released ✓" : "In escrow"}
            </p>
          </div>

          {/* Status badge */}
          <Badge status={m.status} />

          {/* Expand chevron */}
          {!locked && (
            <span style={{ color: T.muted, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
              <Icon d={icons.chevron} size={15} />
            </span>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px 18px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
              {/* GLM score */}
              <div style={{ background: T.bg, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  GLM Analysis
                </p>
                <GlmRing score={m.glmScore} />
                {m.notes && (
                  <p style={{ fontSize: 12, color: T.sub, margin: "10px 0 0", lineHeight: 1.5 }}>
                    {m.notes}
                  </p>
                )}
              </div>

              {/* Submission info */}
              <div style={{ background: T.bg, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Submission
                </p>
                {m.submission ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Icon d={icons.file} size={14} />
                      <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>
                        Revision {m.submission.revisionNumber}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, margin: "0 0 4px", fontFamily: "'DM Mono', monospace" }}>
                      Hash: {m.submission.fileHash}
                    </p>
                    <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                      Submitted {m.submission.submittedAt}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>No submission yet.</p>
                    {m.status === "IN_PROGRESS" && (
                      <button style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: T.accent, color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 14px", fontSize: 12,
                        fontWeight: 600, cursor: "pointer", width: "fit-content",
                      }}>
                        <Icon d={icons.upload} size={13} />
                        Upload Deliverable
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {m.status === "SUBMITTED" && (
              <div style={{
                background: "#FEF3C7", border: "1px solid #FCD34D",
                borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon d={icons.alert} size={15} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.warning }}>
                    Awaiting client review — auto-releases in 48 hrs if no response
                  </span>
                </div>
                <button style={{
                  fontSize: 12, color: T.warning, fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer",
                }}>
                  View details →
                </button>
              </div>
            )}
            {m.status === "RELEASED" && (
              <div style={{
                background: T.accentLight, border: `1px solid ${T.accent}30`,
                borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon d={icons.check} size={14} />
                <span style={{ fontSize: 12, fontWeight: 500, color: T.accentText }}>
                  Payment of RM {m.amount.toLocaleString()} released to your wallet
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Job card ─────────────────────────────────────────────────────────────────
const JobCard = ({ job }) => {
  const [open, setOpen] = useState(true);
  const done = job.milestones.filter(m => m.status === "RELEASED" || m.status === "APPROVED").length;
  const total = job.milestones.length;
  const earned = job.milestones.filter(m => m.status === "RELEASED" || m.status === "APPROVED").reduce((s, m) => s + m.amount, 0);

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 16, background: T.card, marginBottom: 20, overflow: "hidden" }}>
      {/* Job header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "18px 22px", cursor: "pointer",
          borderBottom: open ? `1px solid ${T.border}` : "none",
          background: open ? T.bg : T.card,
        }}
      >
        {/* Category dot */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: T.accentLight, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon d={job.category === "Design" ? icons.star : icons.brief} size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{job.title}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: T.accentLight, color: T.accentText,
            }}>
              {job.category}
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.sub, margin: "0 0 8px" }}>{job.company}</p>
          <ProgressBar value={done} total={total} />
        </div>

        {/* Amount summary */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 2px", fontFamily: "'DM Mono', monospace" }}>
            RM {earned.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: T.muted }}>/ {job.totalAmount.toLocaleString()}</span>
          </p>
          <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
            Escrow: <span style={{ color: T.accent, fontWeight: 600 }}>FUNDED</span>
          </p>
        </div>

        <span style={{ color: T.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <Icon d={icons.chevron} size={16} />
        </span>
      </div>

      {/* Milestones */}
      {open && (
        <div style={{ padding: "22px 22px 22px 22px" }}>
          {job.milestones.map((m, i) => (
            <MilestoneRow key={m.id} m={m} isLast={i === job.milestones.length - 1} accent={T.accent} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MilestonePage() {
  const totalEarned = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "RELEASED").reduce((a, m) => a + m.amount, 0), 0);
  const totalValue  = jobs.reduce((s, j) => s + j.totalAmount, 0);
  const pending     = jobs.reduce((s, j) => s + j.milestones.filter(m => m.status === "SUBMITTED").length, 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: 0, letterSpacing: "-0.3px" }}>
          Active Work
        </h1>
        <p style={{ fontSize: 14, color: T.sub, margin: "4px 0 0" }}>
          Track your milestones, submissions, and escrow releases.
        </p>
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Active Jobs",       value: `${jobs.length}`,                        sub: `${jobs.reduce((s,j)=>s+j.milestones.length,0)} total milestones`, up: null },
          { label: "Earned So Far",     value: `RM ${totalEarned.toLocaleString()}`,     sub: `of RM ${totalValue.toLocaleString()} contracted`,                  up: true },
          { label: "Pending Review",    value: `${pending}`,                             sub: pending > 0 ? "Awaiting client approval" : "All clear",             up: pending > 0 ? null : true },
          { label: "In Escrow",         value: `RM ${(totalValue - totalEarned).toLocaleString()}`, sub: "Protected by platform",                                up: null },
        ].map((s, i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ fontSize: 12, color: T.muted, margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" }}>
              {s.value}
            </p>
            <p style={{ fontSize: 12, color: s.up === true ? T.accent : T.sub, margin: 0, fontWeight: 500 }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Jobs & Milestones
        </p>
        <span style={{ fontSize: 12, color: T.muted }}>
          Click a milestone to expand details
        </span>
      </div>

      {/* Job cards */}
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
