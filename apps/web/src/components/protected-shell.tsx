"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { AdminDisputesPage } from "./admin-disputes-page";
import { FreelancerDashboard } from "./freelancer-dashboard";
import { CompanyDashboard } from "./company-dashboard";
import { WorkspaceLayout } from "./workspace-layout";

type ProtectedShellProps = {
  mode: "dashboard" | "admin";
};

const accessRedirect = (user: PublicUser | null, requiredRole?: AppRole) => {
  if (!user) {
    return "/login";
  }

  if (requiredRole && user.role !== requiredRole) {
    return "/dashboard";
  }

  return null;
};

export const ProtectedShell = ({ mode }: ProtectedShellProps) => {
  const state = useProtectedUser(mode === "admin" ? "admin" : undefined);

  if (state.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Checking your session</h1>
        <p className="muted">Restoring your workspace and permissions.</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Session unavailable</h1>
        <p className="muted">{state.message}</p>
        <Link className="button-secondary" href="/login">
          Back to login
        </Link>
      </section>
    );
  }

  const { user } = state;
  const isAdmin = user.role === "admin";
  const heading =
    mode === "admin"
      ? "Admin console"
      : isAdmin
        ? "Admin workspace"
        : user.role === "company"
          ? "Company dashboard"
          : "Freelancer dashboard";
  const summary =
    mode === "admin"
      ? "RBAC is active. Only seeded admin accounts can reach this route."
        : user.role === "company"
          ? "Build and validate structured briefs before publishing them to the marketplace."
        : isAdmin
          ? "This placeholder confirms admin accounts can also pass the standard dashboard guard."
          : "Track assigned milestones, upload deliverables, and keep revisions inside the protected workflow.";

  if (mode === "admin") {
    return <AdminDisputesPage user={user} />;
  }

  if (user.role === "freelancer" && mode === "dashboard") {
    return <FreelancerDashboard user={user} />;
  }

  if (user.role === "company" && mode === "dashboard") {
    return <CompanyDashboard user={user} />;
  }

  return (
    <WorkspaceLayout subtitle={summary} title={heading} user={user}>
      <div className="status-grid">
        <article className="status-panel">
          <span className="panel-label">Signed in as</span>
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Role</span>
          <strong>{user.role}</strong>
          <p>Role-based route protection is active.</p>
        </article>
      </div>

      {user.role === "company" && mode === "dashboard" ? (
        <div className="action-row">
          <Link className="button-primary" href="/jobs/new">
            Create job draft
          </Link>
          <Link className="button-secondary" href="/jobs">
            View job board
          </Link>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
};

export { accessRedirect };
