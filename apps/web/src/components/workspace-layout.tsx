"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { type ReactNode, startTransition, useEffect, useState } from "react";
import { authApi, freelancersApi, profileApi } from "@/lib/api";

// ── Inline SVG icon helper ────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  briefcase:     "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  fileText:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  layers:        "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  income:        "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  inbox:         "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  user:          "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield:        "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  alertTriangle: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  clipboard:     "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  search:        "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  bell:          "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  plus:          "M12 5v14 M5 12h14",
  logOut:        "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
};

type IconKey = keyof typeof ICONS;

// ── Role-based nav configuration ──────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: IconKey };
type NavSection = { group: string | null; items: NavItem[] };

const roleNavSections: Record<AppRole, NavSection[]> = {
  freelancer: [
    {
      group: null,
      items: [
        { href: "/dashboard",             label: "Dashboard",   icon: "dashboard" },
        { href: "/freelancer/browse-jobs",label: "Browse Jobs", icon: "briefcase" },
        { href: "/freelancer/requests",   label: "Job Requests",icon: "fileText"  },
        { href: "/freelancer/active-jobs",label: "Active Work", icon: "layers"    },
      ],
    },
    {
      group: "EARNINGS",
      items: [
        { href: "/freelancer/income", label: "My Income", icon: "income" },
      ],
    },
    {
      group: "MESSAGES",
      items: [
        { href: "/freelancer/inbox", label: "Inbox", icon: "inbox" },
      ],
    },
    {
      group: "ACCOUNT",
      items: [
        { href: "/freelancer/profile", label: "Profile", icon: "user" },
      ],
    },
  ],
  company: [
    {
      group: null,
      items: [
        { href: "/dashboard",          label: "Dashboard",   icon: "dashboard" },
        { href: "/jobs",               label: "Job History", icon: "layers"    },
        { href: "/company/requests",   label: "Job Requests",icon: "fileText"  },
      ],
    },
    {
      group: "MESSAGES",
      items: [
        { href: "/company/inbox", label: "Inbox", icon: "inbox" },
      ],
    },
    {
      group: "ACCOUNT",
      items: [
        { href: "/company/profile", label: "Profile", icon: "user" },
      ],
    },
  ],
  admin: [
    {
      group: null,
      items: [
        { href: "/admin",          label: "Dashboard",  icon: "dashboard"     },
        { href: "/admin/disputes", label: "Disputes",   icon: "alertTriangle" },
        { href: "/admin/audit",    label: "Audit Log",  icon: "clipboard"     },
      ],
    },
  ],
};

// ── Role accent colours ───────────────────────────────────────────────────────
type RoleStyle = {
  accent: string;
  accentLight: string;
  accentText: string;
  tagline: string;
  cta: string;
  ctaHref: string;
};

const roleStyle: Record<AppRole, RoleStyle> = {
  freelancer: {
    accent:      "#0F6E56",
    accentLight: "#E1F5EE",
    accentText:  "#085041",
    tagline:     "Freelancer",
    cta:         "Find Jobs",
    ctaHref:     "/freelancer/browse-jobs",
  },
  company: {
    accent:      "#1D4ED8",
    accentLight: "#EFF6FF",
    accentText:  "#1e40af",
    tagline:     "Company",
    cta:         "Post Job",
    ctaHref:     "/jobs/new",
  },
  admin: {
    accent:      "#7C3AED",
    accentLight: "#F5F3FF",
    accentText:  "#5b21b6",
    tagline:     "Super Admin",
    cta:         "Audit Log",
    ctaHref:     "/admin/audit",
  },
};

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const isActive = (pathname: string, href: string, role: AppRole) => {
  if (role === "admin" && href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
};

// ── Component ─────────────────────────────────────────────────────────────────
type WorkspaceLayoutProps = {
  user: PublicUser;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const WorkspaceLayout = ({ user, title, subtitle, children }: WorkspaceLayoutProps) => {
  const pathname = usePathname();
  const router   = useRouter();
  const [logoutPending, setLogoutPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; type: "freelancer" | "company"; meta?: string }[]>([]);
  const [showResults, setShowResults] = useState(false);

  const cfg      = roleStyle[user.role];
  const sections = roleNavSections[user.role];
  const initials = getInitials(user.name);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (user.role === "company") {
          const { freelancers } = await freelancersApi.list();
          const filtered = freelancers
            .filter(f => 
              f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 5)
            .map(f => ({ 
              id: f.id, 
              name: f.displayName || f.name, 
              type: "freelancer" as const, 
              meta: f.skills.slice(0, 2).join(", ") || "No skills listed" 
            }));
          setSearchResults(filtered);
        } else if (user.role === "freelancer") {
          const { companies } = await profileApi.listPublicCompanies();
          const filtered = companies
            .filter(c => 
              c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 5)
            .map(c => ({ 
              id: c.id, 
              name: c.companyName, 
              type: "company" as const, 
              meta: c.industry || "Industry unspecified" 
            }));
          setSearchResults(filtered);
        }
        setShowResults(true);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user.role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setShowResults(false);
    if (user.role === "company") {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery)}`);
    } else if (user.role === "freelancer") {
      router.push(`/freelancer/browse-jobs?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    setLogoutPending(true);
    startTransition(async () => {
      try { await authApi.logout(); } finally {
        router.replace("/login");
        router.refresh();
        setLogoutPending(false);
      }
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F9FAFB", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: "#fff", borderRight: "1px solid #E5E7EB",
        display: "flex", flexDirection: "column",
        height: "100vh", overflowY: "auto",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: cfg.accent, display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "#fff",
            }}>
              <Icon d={ICONS.shield} size={16} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.2px" }}>
                GigHub
              </p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Workspace</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6", position: "relative" }}>
          <form 
            onSubmit={handleSearch}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#F9FAFB", border: "1px solid #E5E7EB",
              borderRadius: 9, padding: "7px 12px",
            }}
          >
            <span style={{ color: "#9CA3AF", flexShrink: 0 }}>
              <Icon d={ICONS.search} size={14} />
            </span>
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              style={{
                border: "none", background: "none", outline: "none",
                fontSize: 13, color: "#374151", width: "100%",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </form>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 14, right: 14,
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              zIndex: 100, marginTop: 4, overflow: "hidden"
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", padding: "10px 12px 4px", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                {user.role === "company" ? "Freelancers" : "Companies"}
              </p>
              {searchResults.map(res => (
                <Link
                  key={res.id}
                  href={res.type === "freelancer" ? `/freelancers/${res.id}` : `/companies/${res.id}`}
                  onClick={() => { setShowResults(false); setSearchQuery(""); }}
                  style={{
                    display: "block", padding: "10px 12px", textDecoration: "none",
                    borderBottom: "1px solid #F3F4F6", transition: "background 0.1s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827" }}>{res.name}</span>
                  {res.meta && <span style={{ display: "block", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{res.meta}</span>}
                </Link>
              ))}
              <button 
                onClick={handleSearch}
                style={{
                  width: "100%", padding: "10px", background: "#F9FAFB", border: "none",
                  fontSize: 11, fontWeight: 600, color: cfg.accentText, cursor: "pointer",
                  textAlign: "center", display: "block"
                }}
              >
                View all results for "{searchQuery}"
              </button>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: "10px", overflowY: "auto" }} aria-label="Main navigation">
          {sections.map((section, si) => (
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
                const active = isActive(pathname, item.href, user.role);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "8px 10px", borderRadius: 9,
                      border: "none", textAlign: "left",
                      background: active ? cfg.accentLight : "transparent",
                      color: active ? cfg.accentText : "#374151",
                      fontWeight: active ? 600 : 400, fontSize: 13,
                      textDecoration: "none", marginBottom: 1,
                      transition: "background 0.12s, color 0.12s",
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ color: active ? cfg.accent : "#9CA3AF", flexShrink: 0 }}>
                      <Icon d={ICONS[item.icon]} size={16} />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div style={{
          padding: "14px", borderTop: "1px solid #F3F4F6",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 99, flexShrink: 0,
            background: cfg.accent + "20", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.accentText }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: "#111827", margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user.name}
            </p>
            <p style={{ fontSize: 11, color: cfg.accent, margin: 0, fontWeight: 500 }}>
              {cfg.tagline}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutPending}
            title="Sign out"
            type="button"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", padding: 4, flexShrink: 0,
            }}
          >
            <Icon d={ICONS.logOut} size={15} />
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
              borderRadius: 99, background: cfg.accentLight, color: cfg.accentText,
              textTransform: "capitalize",
            }}>
              {cfg.tagline}
            </span>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>/ {title}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              aria-label="Notifications"
              style={{
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: 9, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#6B7280",
              }}
            >
              <Icon d={ICONS.bell} size={16} />
            </button>
            <Link
              href={cfg.ctaHref}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: cfg.accent, color: "#fff",
                borderRadius: 9, padding: "0 16px", height: 36,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                letterSpacing: "-0.1px",
              }}
            >
              <Icon d={ICONS.plus} size={14} />
              {cfg.cta}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontSize: 24, fontWeight: 600, color: "#111827",
              margin: 0, letterSpacing: "-0.3px",
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0", fontWeight: 400 }}>
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};
