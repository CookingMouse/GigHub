"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { CompanyDashboard } from "./company-dashboard";
import { FreelancerDashboard } from "./freelancer-dashboard";

type ProtectedShellProps = {
  mode: "dashboard";
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
  const state = useProtectedUser(undefined);

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
  if (user.role === "freelancer" && mode === "dashboard") {
    return <FreelancerDashboard user={user} />;
  }

  if (user.role === "company" && mode === "dashboard") {
    return <CompanyDashboard user={user} />;
  }

  return (
    <div className="shell-card">
      <p className="eyebrow">GigHub</p>
      <h1>Unknown role</h1>
      <p className="muted">Your account role is not recognized.</p>
    </div>
  );
};

export { accessRedirect };
