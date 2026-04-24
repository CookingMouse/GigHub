import { useState } from "react";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  edit:      "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check:     "M20 6L9 17l-5-5",
  plus:      "M12 5v14 M5 12h14",
  close:     "M18 6L6 18 M6 6l12 12",
  star:      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0-2 2v16",
  globe:     "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  linkedin:  "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  github:    "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
  mail:      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  phone:     "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  location:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  award:     "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  trending:  "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  clock:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  camera:    "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  glm:       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M8 12h8 M12 8v8",
  download:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  money:     "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  copy:      "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  info:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8h.01 M12 12v4",
};

// ── Design tokens ────────────────────────────────────────────────────────────
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
  dangerLight: "#FEF2F2",
  warning:     "#B45309",
  warningLight:"#FEF3C7",
  info:        "#1D4ED8",
  infoLight:   "#EFF6FF",
};

// ── Shared primitives ────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ children, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}
    </p>
    {action}
  </div>
);

const EditBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 600, color: T.accent,
    background: T.accentLight, border: "none",
    borderRadius: 8, padding: "5px 11px", cursor: "pointer",
  }}>
    <Icon d={icons.edit} size={12} />
    Edit
  </button>
);

const Tag = ({ label, color = T.accent, onRemove }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 500, padding: "4px 10px",
    borderRadius: 99, background: color + "15", color,
    border: `1px solid ${color}20`,
  }}>
    {label}
    {onRemove && (
      <span onClick={onRemove} style={{ cursor: "pointer", display: "flex", alignItems: "center", opacity: 0.6 }}>
        <Icon d={icons.close} size={10} />
      </span>
    )}
  </span>
);

const StatCard = ({ label, value, sub, up }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
    <p style={{ fontSize: 12, color: T.muted, margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </p>
    <p style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" }}>
      {value}
    </p>
    <p style={{ fontSize: 12, color: up === true ? T.accent : up === false ? T.danger : T.sub, margin: 0, fontWeight: 500 }}>
      {sub}
    </p>
  </div>
);

const StarRating = ({ value, max = 5 }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} style={{ color: i < Math.floor(value) ? "#F59E0B" : i < value ? "#FCD34D" : "#E5E7EB" }}>
        <Icon d={icons.star} size={14} />
      </span>
    ))}
  </div>
);

// ── Mock data ────────────────────────────────────────────────────────────────
const profile = {
  name:        "Ahmad Razi bin Azman",
  handle:      "@ahmadrazi",
  title:       "Senior UI/UX Designer & Frontend Developer",
  location:    "Kuala Lumpur, Malaysia",
  tagline:     "I design interfaces that feel intuitive and build frontends that perform. 5 years shipping products for Malaysian startups and regional enterprises.",
  avatar:      "AR",
  avatarColor: T.accent,
  available:   true,
  verified:    true,
  rate:        120,
  rateUnit:    "hr",
  joinedDate:  "March 2024",
  lastActive:  "Today",
  website:     "ahmadrazi.my",
  linkedin:    "linkedin.com/in/ahmadrazi",
  github:      "github.com/ahmadrazi",
  email:       "ahmad@ahmadrazi.my",
  skills: [
    { label: "Figma",        color: T.accent },
    { label: "React",        color: T.info   },
    { label: "TypeScript",   color: T.info   },
    { label: "Tailwind CSS", color: T.info   },
    { label: "UI/UX Design", color: T.accent },
    { label: "Framer",       color: "#7C3AED"},
    { label: "Next.js",      color: T.info   },
    { label: "Node.js",      color: "#15803D"},
    { label: "PostgreSQL",   color: "#1D4ED8"},
  ],
  categories: ["Design", "Development", "Prototyping"],
  languages:  [
    { lang: "Bahasa Malaysia", level: "Native"      },
    { lang: "English",         level: "Fluent"       },
    { lang: "Mandarin",        level: "Conversational"},
  ],
  stats: {
    totalEarned:     "RM 18,600",
    jobsCompleted:   12,
    avgRating:       4.8,
    completionRate:  96,
    avgResponseTime: "< 2 hrs",
    onTimeRate:      98,
  },
  glmMatchScore: 91,
  glmStrengths:  ["UI/UX", "React", "Dashboard design", "Figma handoff"],
  glmWeaknesses: ["Mobile native (iOS/Android)", "Video editing"],
  badges: [
    { label: "Top Rated",      color: "#F59E0B", icon: "award"  },
    { label: "On-Time Pro",    color: T.accent,  icon: "clock"  },
    { label: "Verified ID",    color: T.info,    icon: "shield" },
    { label: "Fast Responder", color: "#7C3AED", icon: "trending"},
  ],
  experience: [
    { role: "Senior UI Designer", company: "Grab Malaysia", period: "2022 – 2023", desc: "Led redesign of driver and merchant dashboards. Delivered 3 major feature launches." },
    { role: "Frontend Developer",  company: "Axrail Sdn Bhd", period: "2021 – 2022", desc: "Built internal operations tools using React and TypeScript." },
    { role: "Freelance Designer",  company: "Self-employed",   period: "2019 – 2021", desc: "Worked with 20+ clients across e-commerce, fintech, and education." },
  ],
  portfolio: [
    { title: "Fintech Dashboard",    category: "Design",      deliverable: "Figma + Handoff",  glmScore: 94 },
    { title: "E-commerce Redesign",  category: "Design",      deliverable: "Full UI System",   glmScore: 88 },
    { title: "API Integration Tool", category: "Development", deliverable: "React + Node.js",  glmScore: 82 },
  ],
  reviews: [
    { company: "TechCorp Sdn Bhd",     rating: 5,   comment: "Ahmad delivered exceptional work — the brief was followed precisely and the design system was production-ready.", date: "Apr 2026" },
    { company: "StartX Technologies",  rating: 5,   comment: "Fast, clean, and professional. Will definitely hire again for the next sprint.",                                  date: "Mar 2026" },
    { company: "FinanceY",             rating: 4,   comment: "Good quality work overall. Minor revision needed on mobile breakpoints but was resolved quickly.",               date: "Feb 2026" },
  ],
};

// ── GLM match ring ───────────────────────────────────────────────────────────
const GlmRing = ({ score, size = 64 }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? T.accent : score >= 60 ? T.warning : T.danger;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: size * 0.13, color: T.muted, lineHeight: 1, marginTop: 1 }}>GLM</span>
      </div>
    </div>
  );
};

// ── Edit modal shell ─────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 20,
  }}>
    <div style={{
      background: T.card, borderRadius: 16, width: "100%", maxWidth: 520,
      maxHeight: "90vh", overflowY: "auto",
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{title}</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}>
          <Icon d={icons.close} size={18} />
        </button>
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
      <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: T.sub, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 18px", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: T.accent, border: "none", borderRadius: 9, padding: "8px 18px", cursor: "pointer" }}>
          Save changes
        </button>
      </div>
    </div>
  </div>
);

const InputField = ({ label, value, onChange, type = "text", rows }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.sub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {rows ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", fontSize: 13.5, color: T.text, outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "vertical", boxSizing: "border-box" }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", fontSize: 13.5, color: T.text, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
    )}
  </div>
);

// ── Main profile page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [modal, setModal]         = useState(null); // "bio" | "skills" | "rate" | "links"
  const [skills, setSkills]       = useState(profile.skills);
  const [newSkill, setNewSkill]   = useState("");
  const [available, setAvailable] = useState(profile.available);
  const [copied, setCopied]       = useState(false);

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setSkills(s => [...s, { label: newSkill.trim(), color: T.accent }]);
    setNewSkill("");
  };

  const copyProfile = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: T.text, margin: 0, letterSpacing: "-0.3px" }}>My Profile</h1>
          <p style={{ fontSize: 14, color: T.sub, margin: "4px 0 0" }}>How companies and GLM see you on Gighub.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyProfile} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: copied ? T.accent : T.sub,
            background: copied ? T.accentLight : T.bg,
            border: `1px solid ${copied ? T.accent + "40" : T.border}`,
            borderRadius: 9, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
          }}>
            <Icon d={copied ? icons.check : icons.copy} size={14} />
            {copied ? "Copied!" : "Copy profile link"}
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "#fff",
            background: T.accent, border: "none",
            borderRadius: 9, padding: "8px 16px", cursor: "pointer",
          }}>
            <Icon d={icons.download} size={14} />
            Download CV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Earned"     value={profile.stats.totalEarned}         sub="Lifetime on Gighub"     up={null} />
        <StatCard label="Jobs Completed"   value={profile.stats.jobsCompleted}        sub="96% completion rate"    up={true} />
        <StatCard label="Avg Rating"       value={`${profile.stats.avgRating} / 5`}   sub="Across 12 reviews"      up={true} />
        <StatCard label="On-Time Rate"     value={`${profile.stats.onTimeRate}%`}      sub="Milestones on schedule" up={true} />
      </div>

      {/* Main 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Identity card */}
          <Card>
            <div style={{ padding: "22px 20px" }}>
              {/* Avatar + availability */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 99,
                    background: T.accentLight, border: `3px solid ${T.accent}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: T.accentText }}>
                      {profile.avatar}
                    </span>
                  </div>
                  <button style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: 99,
                    background: T.accent, border: "2px solid #fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#fff",
                  }}>
                    <Icon d={icons.camera} size={12} />
                  </button>
                </div>

                <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 2px", textAlign: "center" }}>
                  {profile.name}
                </p>
                <p style={{ fontSize: 12, color: T.muted, margin: "0 0 6px" }}>{profile.handle}</p>

                {/* Available toggle */}
                <div
                  onClick={() => setAvailable(a => !a)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    fontSize: 12, fontWeight: 600,
                    padding: "5px 12px", borderRadius: 99, cursor: "pointer",
                    background: available ? "#DCFCE7" : "#F3F4F6",
                    color: available ? "#15803D" : T.muted,
                    border: `1px solid ${available ? "#BBF7D0" : T.border}`,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: 99,
                    background: available ? "#22C55E" : T.muted,
                  }} />
                  {available ? "Available for work" : "Not available"}
                </div>
              </div>

              {/* Title + location */}
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 4px", textAlign: "center", lineHeight: 1.4 }}>
                {profile.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 14 }}>
                <Icon d={icons.location} size={12} />
                <span style={{ fontSize: 12, color: T.sub }}>{profile.location}</span>
              </div>

              {/* Rate */}
              <div style={{
                background: T.bg, borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14,
              }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hourly Rate</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, fontFamily: "'DM Mono', monospace" }}>
                    RM {profile.rate}<span style={{ fontSize: 12, fontWeight: 400, color: T.muted }}> / hr</span>
                  </p>
                </div>
                <button onClick={() => setModal("rate")} style={{
                  background: T.accentLight, border: "none", borderRadius: 8,
                  padding: "6px 10px", cursor: "pointer", color: T.accent,
                }}>
                  <Icon d={icons.edit} size={14} />
                </button>
              </div>

              {/* Links */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: "globe",    label: profile.website  },
                  { icon: "linkedin", label: "LinkedIn"        },
                  { icon: "github",   label: "GitHub"          },
                  { icon: "mail",     label: profile.email     },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: T.muted }}><Icon d={icons[l.icon]} size={14} /></span>
                    <span style={{ fontSize: 12.5, color: T.sub }}>{l.label}</span>
                  </div>
                ))}
                <button onClick={() => setModal("links")} style={{
                  fontSize: 12, fontWeight: 600, color: T.accent,
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", padding: 0, marginTop: 2,
                }}>
                  + Edit links
                </button>
              </div>
            </div>
          </Card>

          {/* Badges */}
          <Card>
            <div style={{ padding: "18px 20px" }}>
              <SectionLabel>Badges</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {profile.badges.map((b, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 10,
                    background: b.color + "10", border: `1px solid ${b.color}20`,
                  }}>
                    <span style={{ color: b.color }}><Icon d={icons[b.icon]} size={15} /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: b.color }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Languages */}
          <Card>
            <div style={{ padding: "18px 20px" }}>
              <SectionLabel>Languages</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {profile.languages.map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{l.lang}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: T.bg, color: T.sub, border: `1px solid ${T.border}` }}>
                      {l.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* GLM profile score */}
          <Card>
            <div style={{ padding: "18px 20px" }}>
              <SectionLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon d={icons.glm} size={13} />
                  GLM Match Profile
                </span>
              </SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <GlmRing score={profile.glmMatchScore} size={64} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>Strong match profile</p>
                  <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.5 }}>
                    GLM ranks you highly for UI/UX and React-based jobs.
                  </p>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Top strengths
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.glmStrengths.map((s, i) => <Tag key={i} label={s} color={T.accent} />)}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Lower match areas
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.glmWeaknesses.map((s, i) => <Tag key={i} label={s} color={T.muted} />)}
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 9, background: T.infoLight, border: `1px solid ${T.info}20` }}>
                <p style={{ fontSize: 11.5, color: T.info, margin: 0, lineHeight: 1.5 }}>
                  <strong>Tip:</strong> Adding mobile development skills could increase your job match rate by ~18%.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Bio */}
          <Card>
            <div style={{ padding: "20px 22px" }}>
              <SectionLabel action={<EditBtn onClick={() => setModal("bio")} />}>
                About
              </SectionLabel>
              <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.7, margin: 0 }}>
                {profile.tagline}
              </p>
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <div style={{ padding: "20px 22px" }}>
              <SectionLabel action={<EditBtn onClick={() => setModal("skills")} />}>
                Skills & Tools
              </SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {skills.map((s, i) => (
                  <Tag key={i} label={s.label} color={s.color} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
                  Categories: {profile.categories.map((c, i) => (
                    <span key={i} style={{ fontWeight: 600, color: T.sub }}>{c}{i < profile.categories.length - 1 ? ", " : ""}</span>
                  ))}
                </p>
              </div>
            </div>
          </Card>

          {/* Experience */}
          <Card>
            <div style={{ padding: "20px 22px" }}>
              <SectionLabel action={<EditBtn onClick={() => setModal("bio")} />}>
                Work Experience
              </SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {profile.experience.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < profile.experience.length - 1 ? 18 : 0, marginBottom: i < profile.experience.length - 1 ? 0 : 0 }}>
                    {/* Timeline */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 99, background: T.accent, border: `2px solid ${T.accentLight}`, flexShrink: 0, marginTop: 4 }} />
                      {i < profile.experience.length - 1 && (
                        <div style={{ flex: 1, width: 1.5, background: T.border, marginTop: 6 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < profile.experience.length - 1 ? 18 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{e.role}</p>
                        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap", marginLeft: 10 }}>{e.period}</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.accent, margin: "0 0 4px" }}>{e.company}</p>
                      <p style={{ fontSize: 12.5, color: T.sub, margin: 0, lineHeight: 1.5 }}>{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Portfolio */}
          <Card>
            <div style={{ padding: "20px 22px" }}>
              <SectionLabel action={
                <button style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, color: T.accent,
                  background: T.accentLight, border: "none",
                  borderRadius: 8, padding: "5px 11px", cursor: "pointer",
                }}>
                  <Icon d={icons.plus} size={12} />
                  Add work
                </button>
              }>
                Portfolio
              </SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {profile.portfolio.map((p, i) => (
                  <div key={i} style={{
                    border: `1px solid ${T.border}`, borderRadius: 12,
                    overflow: "hidden", cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.accentLight}`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* Placeholder thumbnail */}
                    <div style={{
                      height: 90, background: `linear-gradient(135deg, ${T.accentLight} 0%, ${T.infoLight} 100%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon d={icons.briefcase} size={28} />
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text, margin: "0 0 2px" }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: T.sub, margin: "0 0 6px" }}>{p.deliverable}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Tag label={p.category} color={p.category === "Design" ? T.accent : T.info} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, fontFamily: "'DM Mono', monospace" }}>
                          {p.glmScore}% match
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Reviews */}
          <Card>
            <div style={{ padding: "20px 22px" }}>
              <SectionLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Reviews
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#FEF3C7", color: "#B45309" }}>
                    ★ {profile.stats.avgRating}
                  </span>
                </span>
              </SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {profile.reviews.map((r, i) => (
                  <div key={i} style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: T.bg, border: `1px solid ${T.border}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 99, background: T.infoLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: T.info }}>{r.company.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.company}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StarRating value={r.rating} />
                        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{r.date}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
                      "{r.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "bio" && (
        <Modal title="Edit About" onClose={() => setModal(null)}>
          <InputField label="Professional Title" value={profile.title} onChange={() => {}} />
          <InputField label="Location" value={profile.location} onChange={() => {}} />
          <InputField label="About / Tagline" value={profile.tagline} onChange={() => {}} rows={4} />
        </Modal>
      )}
      {modal === "rate" && (
        <Modal title="Edit Hourly Rate" onClose={() => setModal(null)}>
          <InputField label="Hourly Rate (RM)" value={String(profile.rate)} onChange={() => {}} type="number" />
          <div style={{ padding: "10px 12px", borderRadius: 9, background: T.infoLight, border: `1px solid ${T.info}20` }}>
            <p style={{ fontSize: 12, color: T.info, margin: 0 }}>
              Your rate is visible to companies browsing your profile. GLM uses this to match you to appropriately budgeted jobs.
            </p>
          </div>
        </Modal>
      )}
      {modal === "skills" && (
        <Modal title="Edit Skills" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {skills.map((s, i) => (
              <Tag key={i} label={s.label} color={s.color} onRemove={() => setSkills(sk => sk.filter((_, j) => j !== i))} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSkill()}
              placeholder="Type a skill and press Enter..."
              style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", fontSize: 13.5, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            <button onClick={addSkill} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              Add
            </button>
          </div>
        </Modal>
      )}
      {modal === "links" && (
        <Modal title="Edit Links" onClose={() => setModal(null)}>
          <InputField label="Website" value={profile.website} onChange={() => {}} />
          <InputField label="LinkedIn URL" value={profile.linkedin} onChange={() => {}} />
          <InputField label="GitHub URL" value={profile.github} onChange={() => {}} />
          <InputField label="Email" value={profile.email} onChange={() => {}} type="email" />
        </Modal>
      )}
    </div>
  );
}
