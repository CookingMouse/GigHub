import { useState } from "react";

// ── Icons (inline SVG to avoid dependency) ──────────────────────────────────
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:   "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  briefcase:   "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  milestone:   "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  wallet:      "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 0 0 0 4h4v-4z",
  file:        "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  dispute:     "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  users:       "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  chart:       "M18 20V10 M12 20V4 M6 20v-6",
  bell:        "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  search:      "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  income:      "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  settings:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  logout:      "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  shield:      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  plus:        "M12 5v14 M5 12h14",
  check:       "M20 6L9 17l-5-5",
  clock:       "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  eye:         "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
};

// ── Role configurations ──────────────────────────────────────────────────────
const roleConfig = {
  freelancer: {
    label: "Freelancer",
    accent: "#0F6E56",
    accentLight: "#E1F5EE",
    accentText: "#085041",
    avatar: "FS",
    name: "Ahmad Razi",
    tagline: "Available for work",
    tagColor: "#0F6E56",
    sections: [
      {
        group: null,
        items: [
          { id: "dashboard", label: "Dashboard",      icon: "dashboard" },
          { id: "jobs",      label: "Browse Jobs",    icon: "briefcase" },
          { id: "active",    label: "Active Work",    icon: "milestone",  badge: 2 },
          { id: "income",    label: "My Income",      icon: "income" },
        ],
      },
      {
        group: "PAYMENTS",
        items: [
          { id: "escrow",    label: "Escrow Status",  icon: "wallet" },
          { id: "statement", label: "Income Statement", icon: "file" },
        ],
      },
      {
        group: "SUPPORT",
        items: [
          { id: "disputes",  label: "Disputes",       icon: "dispute",    badge: 1 },
          { id: "settings",  label: "Settings",       icon: "settings" },
        ],
      },
    ],
  },
  company: {
    label: "Company",
    accent: "#1D4ED8",
    accentLight: "#EFF6FF",
    accentText: "#1e40af",
    avatar: "TC",
    name: "TechCorp Sdn Bhd",
    tagline: "Hiring now",
    tagColor: "#1D4ED8",
    sections: [
      {
        group: null,
        items: [
          { id: "dashboard", label: "Dashboard",      icon: "dashboard" },
          { id: "jobs",      label: "My Jobs",        icon: "briefcase" },
          { id: "talent",    label: "Find Talent",    icon: "users" },
          { id: "active",    label: "Active Projects",icon: "milestone",  badge: 3 },
        ],
      },
      {
        group: "PAYMENTS",
        items: [
          { id: "escrow",    label: "Escrow",         icon: "wallet" },
          { id: "billing",   label: "Billing",        icon: "file" },
        ],
      },
      {
        group: "MANAGEMENT",
        items: [
          { id: "disputes",  label: "Disputes",       icon: "dispute" },
          { id: "analytics", label: "Analytics",      icon: "chart" },
          { id: "settings",  label: "Settings",       icon: "settings" },
        ],
      },
    ],
  },
  admin: {
    label: "Admin",
    accent: "#7C3AED",
    accentLight: "#F5F3FF",
    accentText: "#5b21b6",
    avatar: "AD",
    name: "Platform Admin",
    tagline: "Super Admin",
    tagColor: "#7C3AED",
    sections: [
      {
        group: null,
        items: [
          { id: "dashboard", label: "Dashboard",      icon: "dashboard" },
          { id: "users",     label: "Users",          icon: "users" },
          { id: "jobs",      label: "All Jobs",       icon: "briefcase" },
        ],
      },
      {
        group: "OPERATIONS",
        items: [
          { id: "escrow",    label: "Escrow Ledger",  icon: "wallet" },
          { id: "disputes",  label: "Dispute Queue",  icon: "dispute",    badge: 5 },
          { id: "audit",     label: "Audit Log",      icon: "shield" },
        ],
      },
      {
        group: "INTELLIGENCE",
        items: [
          { id: "glm",       label: "GLM Decisions",  icon: "eye" },
          { id: "analytics", label: "Analytics",      icon: "chart" },
          { id: "settings",  label: "Settings",       icon: "settings" },
        ],
      },
    ],
  },
};

// ── Demo content per page ────────────────────────────────────────────────────
const PageContent = ({ role, page, accent, accentLight }) => {
  const configs = {
    freelancer: {
      dashboard: {
        title: "Welcome back, Ahmad Razi!",
        sub: "You have 2 milestones due this week.",
        stats: [
          { label: "Total Earned",     value: "RM 12,400", sub: "+RM 1,200 this month", up: true },
          { label: "Active Jobs",      value: "2",         sub: "3 milestones pending",  up: null },
          { label: "Completion Rate",  value: "96%",       sub: "Top 5% on platform",    up: true },
          { label: "Avg Monthly",      value: "RM 3,100",  sub: "Last 4 months",         up: null },
        ],
        cards: [
          { title: "UI Redesign — TechCorp",    sub: "Milestone 2 of 3 · Due 28 Apr", tag: "In Progress", tagColor: "#0F6E56" },
          { title: "API Integration — StartX",  sub: "Milestone 1 of 2 · Due 30 Apr", tag: "Pending Review", tagColor: "#B45309" },
          { title: "Dashboard Build — FinanceY",sub: "Submitted · Awaiting approval",  tag: "Under Review", tagColor: "#1D4ED8" },
        ],
      },
      income: {
        title: "Income Statement",
        sub: "Generate a verifiable PDF for bank or loan applications.",
        stats: [
          { label: "Total Earned (2025)", value: "RM 18,600", sub: "6 completed jobs",   up: true },
          { label: "Avg Monthly",         value: "RM 3,100",  sub: "Jan – Apr 2025",     up: null },
          { label: "Peak Month",          value: "RM 4,200",  sub: "March 2025",          up: true },
          { label: "Tax Year",            value: "YA 2025",   sub: "Form B applicable",   up: null },
        ],
        cards: [
          { title: "Statement Jan–Apr 2025",   sub: "Generated 24 Apr 2025 · PDF ready",    tag: "Verified",   tagColor: "#0F6E56" },
          { title: "Statement Jul–Dec 2024",   sub: "Generated 2 Jan 2025 · PDF ready",     tag: "Verified",   tagColor: "#0F6E56" },
          { title: "Statement Jan–Jun 2024",   sub: "Generated 1 Jul 2024 · PDF ready",     tag: "Archived",   tagColor: "#6B7280" },
        ],
      },
    },
    company: {
      dashboard: {
        title: "Welcome back, TechCorp!",
        sub: "3 active projects · 1 milestone awaiting your review.",
        stats: [
          { label: "Active Jobs",      value: "3",          sub: "2 open for applications", up: null },
          { label: "Total Spent",      value: "RM 28,500",  sub: "+RM 4,500 this month",    up: true },
          { label: "Freelancers",      value: "7",          sub: "4 currently active",       up: null },
          { label: "Avg Completion",   value: "94%",        sub: "Brief match score avg",    up: true },
        ],
        cards: [
          { title: "Mobile App Redesign",      sub: "Ahmad Razi · Milestone 2/3 submitted", tag: "Review Needed", tagColor: "#B45309" },
          { title: "Backend API Development",  sub: "Lim Wei Chen · In Progress",            tag: "In Progress",   tagColor: "#1D4ED8" },
          { title: "Brand Identity Kit",       sub: "Open · 4 applications",                 tag: "Hiring",        tagColor: "#0F6E56" },
        ],
      },
      jobs: {
        title: "My Jobs",
        sub: "Manage posted jobs and review applications.",
        stats: [
          { label: "Total Posted",   value: "12",       sub: "Since account created",    up: null },
          { label: "Active",         value: "3",        sub: "Currently running",         up: null },
          { label: "In Escrow",      value: "RM 9,200", sub: "Across 3 jobs",             up: null },
          { label: "Completed",      value: "8",        sub: "100% completion rate",      up: true },
        ],
        cards: [
          { title: "Mobile App Redesign",     sub: "Budget RM 4,500 · 3 milestones",   tag: "Active",     tagColor: "#0F6E56" },
          { title: "Backend API Development", sub: "Budget RM 3,200 · 2 milestones",   tag: "Active",     tagColor: "#0F6E56" },
          { title: "Brand Identity Kit",      sub: "Budget RM 1,800 · 4 applications", tag: "Hiring",     tagColor: "#1D4ED8" },
        ],
      },
    },
    admin: {
      dashboard: {
        title: "Platform Overview",
        sub: "5 disputes need attention · Escrow healthy.",
        stats: [
          { label: "Total Users",    value: "1,284",    sub: "+42 this week",          up: true },
          { label: "Active Jobs",    value: "318",      sub: "89 new this month",      up: true },
          { label: "Escrow Held",    value: "RM 284K",  sub: "Across 318 jobs",        up: null },
          { label: "Disputes Open",  value: "5",        sub: "2 awaiting ruling",      up: false },
        ],
        cards: [
          { title: "Dispute #1042 — Submission rejected",  sub: "Ahmad R. vs TechCorp · Raised 23 Apr", tag: "Urgent",    tagColor: "#DC2626" },
          { title: "Dispute #1039 — Non-delivery claim",   sub: "Lim W. vs StartX · Raised 21 Apr",     tag: "In Review", tagColor: "#B45309" },
          { title: "Dispute #1031 — Brief mismatch",       sub: "Siti N. vs FinanceY · Raised 18 Apr",  tag: "Resolved",  tagColor: "#0F6E56" },
        ],
      },
      disputes: {
        title: "Dispute Queue",
        sub: "Review GLM recommendations and issue rulings.",
        stats: [
          { label: "Open",           value: "5",  sub: "Needs attention",        up: false },
          { label: "In Review",      value: "3",  sub: "GLM analysis done",      up: null },
          { label: "Resolved (30d)", value: "18", sub: "Avg 38hr resolution",    up: true },
          { label: "Escalated",      value: "1",  sub: "Legal review required",  up: false },
        ],
        cards: [
          { title: "Dispute #1042",  sub: "GLM score: 34% brief match · Recommends partial refund", tag: "Urgent",     tagColor: "#DC2626" },
          { title: "Dispute #1039",  sub: "GLM score: 71% brief match · Recommends full release",   tag: "In Review",  tagColor: "#B45309" },
          { title: "Dispute #1031",  sub: "Ruling issued: RM 800 released to freelancer",            tag: "Resolved",   tagColor: "#0F6E56" },
        ],
      },
    },
  };

  const rolePages = configs[role] || configs.freelancer;
  const data = rolePages[page] || rolePages[Object.keys(rolePages)[0]];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.3px" }}>
          {data.title}
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0", fontWeight: 400 }}>
          {data.sub}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {data.stats.map((s, i) => (
          <div key={i} style={{
            background: "#fff", border: "1px solid #E5E7EB",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 6px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: "#111827", margin: "0 0 4px", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" }}>
              {s.value}
            </p>
            <p style={{ fontSize: 12, color: s.up === true ? "#0F6E56" : s.up === false ? "#DC2626" : "#6B7280", margin: 0, fontWeight: 500 }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Recent Activity
        </p>
        <button style={{
          fontSize: 13, color: accent, fontWeight: 500, background: "none",
          border: "none", cursor: "pointer", padding: 0,
        }}>
          View all →
        </button>
      </div>

      {/* Activity cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {data.cards.map((c, i) => (
          <div key={i} style={{
            background: "#fff", border: "1px solid #E5E7EB",
            borderRadius: 14, padding: "18px 20px", cursor: "pointer",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accentLight}`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4, flex: 1, paddingRight: 8 }}>
                {c.title}
              </p>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 99, background: c.tagColor + "15",
                color: c.tagColor, whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {c.tag}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const [role, setRole]     = useState("freelancer");
  const [active, setActive] = useState("dashboard");
  const [notifs]            = useState(3);

  const cfg = roleConfig[role];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F9FAFB", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#fff",
        borderRight: "1px solid #E5E7EB",
        display: "flex", flexDirection: "column",
        height: "100vh", overflowY: "auto",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: cfg.accent, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}>
              <Icon d={icons.shield} size={16} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.2px" }}>
                FreelanceShield
              </p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>v1.0 · Hackathon</p>
            </div>
          </div>
        </div>

        {/* Role switcher (demo only) */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Demo — switch role
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            {["freelancer", "company", "admin"].map(r => (
              <button key={r} onClick={() => { setRole(r); setActive("dashboard"); }} style={{
                flex: 1, fontSize: 11, fontWeight: 600, padding: "5px 4px",
                borderRadius: 7, border: "1px solid",
                borderColor: role === r ? cfg.accent : "#E5E7EB",
                background: role === r ? cfg.accentLight : "#fff",
                color: role === r ? cfg.accentText : "#6B7280",
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
              }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#F9FAFB", border: "1px solid #E5E7EB",
            borderRadius: 9, padding: "7px 12px",
          }}>
            <span style={{ color: "#9CA3AF", flexShrink: 0 }}><Icon d={icons.search} size={14} /></span>
            <input placeholder="Search..." style={{
              border: "none", background: "none", outline: "none",
              fontSize: 13, color: "#374151", width: "100%",
            }} />
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {cfg.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 6 }}>
              {section.group && (
                <p style={{
                  fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                  margin: "14px 8px 4px", textTransform: "uppercase", letterSpacing: "0.1em",
                }}>
                  {section.group}
                </p>
              )}
              {section.items.map(item => {
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => setActive(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "8px 10px", borderRadius: 9,
                    border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? cfg.accentLight : "transparent",
                    color: isActive ? cfg.accentText : "#374151",
                    fontWeight: isActive ? 600 : 400, fontSize: 13,
                    transition: "background 0.12s, color 0.12s",
                    marginBottom: 1,
                  }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F3F4F6"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ color: isActive ? cfg.accent : "#9CA3AF", flexShrink: 0 }}>
                      <Icon d={icons[item.icon]} size={16} />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                        borderRadius: 99, background: "#EF4444",
                        color: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", padding: "0 5px",
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div style={{
          padding: "14px 14px", borderTop: "1px solid #F3F4F6",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 99,
            background: cfg.accent + "20", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.accentText }}>
              {cfg.avatar}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cfg.name}
            </p>
            <p style={{ fontSize: 11, color: cfg.tagColor, margin: 0, fontWeight: 500 }}>
              {cfg.tagline}
            </p>
          </div>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}>
            <Icon d={icons.logout} size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          height: 58, background: "#fff", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "3px 10px",
              borderRadius: 99, background: cfg.accentLight,
              color: cfg.accentText, textTransform: "capitalize",
            }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              / {active.charAt(0).toUpperCase() + active.slice(1)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notification bell */}
            <button style={{
              position: "relative", background: "#F9FAFB",
              border: "1px solid #E5E7EB", borderRadius: 9,
              width: 36, height: 36, display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6B7280",
            }}>
              <Icon d={icons.bell} size={16} />
              {notifs > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  width: 16, height: 16, background: "#EF4444",
                  borderRadius: 99, fontSize: 9, fontWeight: 700,
                  color: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", border: "2px solid #fff",
                }}>
                  {notifs}
                </span>
              )}
            </button>

            {/* CTA button */}
            <button style={{
              display: "flex", alignItems: "center", gap: 6,
              background: cfg.accent, color: "#fff",
              border: "none", borderRadius: 9, padding: "0 16px",
              height: 36, fontSize: 13, fontWeight: 600,
              cursor: "pointer", letterSpacing: "-0.1px",
            }}>
              <Icon d={icons.plus} size={14} />
              {role === "freelancer" ? "Find Jobs" : role === "company" ? "Post Job" : "Add User"}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 28px" }}>
          <PageContent
            role={role}
            page={active}
            accent={cfg.accent}
            accentLight={cfg.accentLight}
          />
        </main>
      </div>
    </div>
  );
}
