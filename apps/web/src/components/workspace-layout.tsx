"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { type ReactNode } from "react";
import { LogoutButton } from "./logout-button";

type WorkspaceLayoutProps = {
  user: PublicUser;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const roleNavItems: Record<Exclude<AppRole, "admin">, NavItem[]> = {
  freelancer: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/freelancer/browse-jobs", label: "Browse Job" },
    { href: "/freelancer/requests", label: "Job Request" },
    { href: "/freelancer/active-jobs", label: "Active Work" },
    { href: "/freelancer/income", label: "Income Generator" },
    { href: "/freelancer/inbox", label: "Inbox" },
    { href: "/freelancer/profile", label: "Profile" }
  ],
  company: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/company/requests", label: "Job Request" },
    { href: "/company/active-jobs", label: "Active Work" },
    { href: "/company/inbox", label: "Inbox" },
    { href: "/company/profile", label: "Profile" }
  ]
};

const adminItems: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/audit", label: "Audit" }
];

const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export const WorkspaceLayout = ({ user, title, subtitle, children }: WorkspaceLayoutProps) => {
  const pathname = usePathname();
  const navItems = user.role === "admin" ? adminItems : roleNavItems[user.role];

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <p className="eyebrow">GigHub</p>
          <h2>Workspace</h2>
          <p className="muted">
            {user.name}
            <br />
            {user.email}
          </p>
        </div>

        <nav className="workspace-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={isActivePath(pathname, item.href) ? "workspace-nav-link active" : "workspace-nav-link"}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="workspace-sidebar-actions">
          <LogoutButton />
        </div>
      </aside>

      <main className="workspace-main">
        <section className="shell-card shell-card-wide">
          <div className="shell-header">
            <div>
              <p className="eyebrow">{user.role}</p>
              <h1>{title}</h1>
              {subtitle ? <p className="muted">{subtitle}</p> : null}
            </div>

            <div className="header-action-group">
              <button
                aria-label="Go back"
                className="button-secondary workspace-history-button"
                onClick={() => window.history.back()}
                type="button"
              >
                &larr;
              </button>
              <button
                aria-label="Go forward"
                className="button-secondary workspace-history-button"
                onClick={() => window.history.forward()}
                type="button"
              >
                &rarr;
              </button>
            </div>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
};
