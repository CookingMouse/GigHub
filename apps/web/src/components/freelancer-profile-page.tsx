"use client";

import React, { useEffect, useState } from "react";
import type { FreelancerProfileRecord } from "@gighub/shared";
import { ApiRequestError, healthApi, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  accent: "#0F6E56",
  accentLight: "#E1F5EE",
  accentText: "#085041",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  card: "#fff",
  text: "#111827",
  sub: "#6B7280",
  muted: "#9CA3AF",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#B45309",
  warningLight: "#FEF3C7",
  info: "#1D4ED8",
  infoLight: "#EFF6FF"
};

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const icons = {
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18 M6 6l12 12",
  briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0-2 2v16",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
};

// ── Mock data for fields not yet in API ──────────────────────────────────────
const MOCK_PROFILE_EXTENSIONS = {
  hourlyRate: 120,
  experience: [
    {
      role: "Senior UI Designer",
      company: "Grab Malaysia",
      period: "2022 – 2023",
      desc: "Led redesign of driver and merchant dashboards. Delivered 3 major feature launches."
    },
    {
      role: "Frontend Developer",
      company: "Axrail Sdn Bhd",
      period: "2021 – 2022",
      desc: "Built internal operations tools using React and TypeScript."
    }
  ],
  portfolio: [
    { title: "Fintech Dashboard", category: "Design", deliverable: "Figma + Handoff" },
    { title: "E-commerce Redesign", category: "Design", deliverable: "Full UI System" },
    { title: "API Integration Tool", category: "Development", deliverable: "React + Node.js" }
  ],
  languages: [
    { lang: "Bahasa Malaysia", level: "Native" },
    { lang: "English", level: "Fluent" },
    { lang: "Mandarin", level: "Conversational" }
  ]
};

// ── Type ────────────────────────────────────────────────────────────────────
type ProfileState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: FreelancerProfileRecord };

// ── Shared Components ──────────────────────────────────────────────────────
const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      ...style
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({
  children,
  action
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        margin: 0,
        textTransform: "uppercase",
        letterSpacing: "0.08em"
      }}
    >
      {children}
    </p>
    {action}
  </div>
);

const EditBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 600,
      color: T.accent,
      background: T.accentLight,
      border: "none",
      borderRadius: 8,
      padding: "5px 11px",
      cursor: "pointer"
    }}
  >
    <Icon d={icons.edit} size={12} />
    Edit
  </button>
);

const Tag = ({ label, color = T.accent }: { label: string; color?: string }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 500,
      padding: "4px 10px",
      borderRadius: 99,
      background: color + "15",
      color,
      border: `1px solid ${color}20`
    }}
  >
    {label}
  </span>
);

const StatCard = ({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub: string;
}) => (
  <div
    style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: "18px 20px"
    }}
  >
    <p
      style={{
        fontSize: 12,
        color: T.muted,
        margin: "0 0 6px",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}
    >
      {label}
    </p>
    <p
      style={{
        fontSize: 22,
        fontWeight: 600,
        color: T.text,
        margin: "0 0 4px",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "-0.5px"
      }}
    >
      {value}
    </p>
    <p style={{ fontSize: 12, color: T.sub, margin: 0, fontWeight: 500 }}>{sub}</p>
  </div>
);

const Modal = ({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20
    }}
  >
    <div
      style={{
        background: T.card,
        borderRadius: 16,
        width: "100%",
        maxWidth: 520,
        maxHeight: "90vh",
        overflowY: "auto",
        border: `1px solid ${T.border}`
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 22px",
          borderBottom: `1px solid ${T.border}`
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>{title}</p>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.muted
          }}
        >
          <Icon d={icons.close} size={18} />
        </button>
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
      <div
        style={{
          padding: "14px 22px",
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10
        }}
      >
        <button
          onClick={onClose}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.sub,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: "8px 18px",
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: T.accent,
            border: "none",
            borderRadius: 9,
            padding: "8px 18px",
            cursor: "pointer"
          }}
        >
          Save changes
        </button>
      </div>
    </div>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  rows
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  rows?: number;
}) => (
  <div style={{ marginBottom: 16 }}>
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: T.sub,
        display: "block",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}
    >
      {label}
    </label>
    {rows ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: "100%",
          border: `1px solid ${T.border}`,
          borderRadius: 9,
          padding: "9px 13px",
          fontSize: 13.5,
          color: T.text,
          outline: "none",
          fontFamily: "'DM Sans', sans-serif",
          resize: "vertical",
          boxSizing: "border-box"
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          border: `1px solid ${T.border}`,
          borderRadius: 9,
          padding: "9px 13px",
          fontSize: 13.5,
          color: T.text,
          outline: "none",
          fontFamily: "'DM Sans', sans-serif",
          boxSizing: "border-box"
        }}
      />
    )}
  </div>
);

// ── Main Profile Page ──────────────────────────────────────────────────────
export const FreelancerProfilePage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [modal, setModal] = useState<"bio" | "skills" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadProfile = async () => {
    try {
      const routeStatus = await healthApi.routes();

      if (!routeStatus.routes.profile) {
        setState({
          status: "error",
          message: "Profile routes are unavailable in the running API process. Restart API and retry."
        });
        return;
      }

      const response = await profileApi.getFreelancerProfile();
      setState({
        status: "ready",
        profile: response.profile
      });
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        setState({
          status: "error",
          message:
            "The running API process does not include the new profile routes yet. Restart API (npm run dev) and retry."
        });
        return;
      }

      setState({
        status: "error",
        message:
          loadError instanceof ApiRequestError
            ? loadError.message
            : "Unable to load profile."
      });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void loadProfile();
    }
  }, [session.status]);

  if (session.status !== "ready") {
    return null;
  }

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateProfile = (field: string, value: unknown) => {
    // TODO: Wire up API PATCH call here when ready
    console.log(`Update ${field}:`, value);
  };

  return (
    <WorkspaceLayout
      title="Profile"
      subtitle="Manage personal details, experience, skills, and portfolio."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}

      {state.status === "loading" ? <p className="muted">Loading profile...</p> : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Profile unavailable</h2>
          <p className="form-error">{state.message}</p>
          <button
            className="button-secondary"
            onClick={() => void loadProfile()}
            type="button"
          >
            Retry
          </button>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {/* Page header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: T.text,
                  margin: 0,
                  letterSpacing: "-0.3px"
                }}
              >
                My Profile
              </h1>
              <p style={{ fontSize: 14, color: T.sub, margin: "4px 0 0" }}>
                How companies and GLM see you on Gighub.
              </p>
            </div>
            <button
              onClick={copyProfileLink}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: copied ? T.accent : T.sub,
                background: copied ? T.accentLight : T.bg,
                border: `1px solid ${copied ? T.accent + "40" : T.border}`,
                borderRadius: 9,
                padding: "8px 16px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <Icon d={copied ? icons.check : icons.copy} size={14} />
              {copied ? "Copied!" : "Copy profile link"}
            </button>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 24
            }}
          >
            <StatCard label="Total Earned" value="—" sub="Lifetime on Gighub" />
            <StatCard label="Jobs Completed" value="—" sub="Completion rate" />
            <StatCard label="Avg Rating" value="—" sub="Across all reviews" />
            <StatCard label="On-Time Rate" value="—" sub="Milestones on schedule" />
          </div>

          {/* Main 2-col layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              gap: 20,
              alignItems: "start"
            }}
          >
            {/* ── Left column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Identity card */}
              <Card>
                <div style={{ padding: "22px 20px" }}>
                  {/* Avatar */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginBottom: 18
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 99,
                        background: T.accentLight,
                        border: `3px solid ${T.accent}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12
                      }}
                    >
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: T.accentText
                        }}
                      >
                        {state.profile.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: T.text,
                        margin: "0 0 2px",
                        textAlign: "center"
                      }}
                    >
                      {state.profile.displayName}
                    </p>
                    {state.profile.headline && (
                      <p style={{ fontSize: 12, color: T.muted, margin: 0, textAlign: "center" }}>
                        {state.profile.headline}
                      </p>
                    )}
                  </div>

                  {/* Links */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {state.profile.portfolioUrl && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: T.muted }}>
                          <Icon d={icons.globe} size={14} />
                        </span>
                        <a
                          href={state.profile.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12.5,
                            color: T.accent,
                            textDecoration: "none"
                          }}
                        >
                          {state.profile.portfolioUrl}
                        </a>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: T.muted }}>
                        <Icon d={icons.mail} size={14} />
                      </span>
                      <span style={{ fontSize: 12.5, color: T.sub }}>
                        {session.user.email}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Languages */}
              <Card>
                <div style={{ padding: "18px 20px" }}>
                  <SectionLabel>Languages</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {MOCK_PROFILE_EXTENSIONS.languages.map((l, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                          {l.lang}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 9px",
                            borderRadius: 99,
                            background: T.bg,
                            color: T.sub,
                            border: `1px solid ${T.border}`
                          }}
                        >
                          {l.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Bio */}
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <SectionLabel
                    action={<EditBtn onClick={() => setModal("bio")} />}
                  >
                    About
                  </SectionLabel>
                  <p
                    style={{
                      fontSize: 14,
                      color: T.sub,
                      lineHeight: 1.7,
                      margin: 0
                    }}
                  >
                    {state.profile.bio || "No bio added yet."}
                  </p>
                </div>
              </Card>

              {/* Skills */}
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <SectionLabel
                    action={<EditBtn onClick={() => setModal("skills")} />}
                  >
                    Skills & Tools
                  </SectionLabel>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10
                    }}
                  >
                    {state.profile.skills.map((s, i) => (
                      <Tag key={i} label={s} color={T.info} />
                    ))}
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
                    {MOCK_PROFILE_EXTENSIONS.experience.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 14,
                          paddingBottom:
                            i < MOCK_PROFILE_EXTENSIONS.experience.length - 1
                              ? 18
                              : 0,
                          marginBottom:
                            i < MOCK_PROFILE_EXTENSIONS.experience.length - 1
                              ? 0
                              : 0
                        }}
                      >
                        {/* Timeline */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 28,
                            flexShrink: 0
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 99,
                              background: T.accent,
                              border: `2px solid ${T.accentLight}`,
                              flexShrink: 0,
                              marginTop: 4
                            }}
                          />
                          {i < MOCK_PROFILE_EXTENSIONS.experience.length - 1 && (
                            <div
                              style={{
                                flex: 1,
                                width: 1.5,
                                background: T.border,
                                marginTop: 6
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            paddingBottom:
                              i < MOCK_PROFILE_EXTENSIONS.experience.length - 1
                                ? 18
                                : 0
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 2
                            }}
                          >
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: T.text,
                                margin: 0
                              }}
                            >
                              {e.role}
                            </p>
                            <span
                              style={{
                                fontSize: 11,
                                color: T.muted,
                                fontFamily: "'DM Mono', monospace",
                                whiteSpace: "nowrap",
                                marginLeft: 10
                              }}
                            >
                              {e.period}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.accent,
                              margin: "0 0 4px"
                            }}
                          >
                            {e.company}
                          </p>
                          <p
                            style={{
                              fontSize: 12.5,
                              color: T.sub,
                              margin: 0,
                              lineHeight: 1.5
                            }}
                          >
                            {e.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Portfolio */}
              <Card>
                <div style={{ padding: "20px 22px" }}>
                  <SectionLabel>Portfolio</SectionLabel>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12
                    }}
                  >
                    {MOCK_PROFILE_EXTENSIONS.portfolio.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          border: `1px solid ${T.border}`,
                          borderRadius: 12,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "border-color 0.15s, box-shadow 0.15s"
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = T.accent;
                          el.style.boxShadow = `0 0 0 3px ${T.accentLight}`;
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = T.border;
                          el.style.boxShadow = "none";
                        }}
                      >
                        {/* Placeholder thumbnail */}
                        <div
                          style={{
                            height: 90,
                            background: `linear-gradient(135deg, ${T.accentLight} 0%, ${T.infoLight} 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Icon d={icons.briefcase} size={28} />
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <p
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: T.text,
                              margin: "0 0 2px"
                            }}
                          >
                            {p.title}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: T.sub,
                              margin: "0 0 6px"
                            }}
                          >
                            {p.deliverable}
                          </p>
                          <Tag
                            label={p.category}
                            color={
                              p.category === "Design" ? T.accent : T.info
                            }
                          />
                        </div>
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
              <InputField
                label="Headline"
                value={state.profile.headline ?? ""}
                onChange={(v) => handleUpdateProfile("headline", v)}
              />
              <InputField
                label="About / Bio"
                value={state.profile.bio ?? ""}
                onChange={(v) => handleUpdateProfile("bio", v)}
                rows={4}
              />
            </Modal>
          )}
          {modal === "skills" && (
            <Modal title="Edit Skills" onClose={() => setModal(null)}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {state.profile.skills.map((s, i) => (
                  <Tag key={i} label={s} color={T.info} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                Edit skills in the form below. This feature will be fully implemented in the next phase.
              </p>
            </Modal>
          )}
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};
