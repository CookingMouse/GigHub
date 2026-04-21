"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { ApiRequestError, authApi } from "@/lib/api";
import { LogoutButton } from "./logout-button";

type ProtectedShellProps = {
  mode: "dashboard" | "admin";
};

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: PublicUser };

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
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const me = await authApi.me();

        if (!isMounted) {
          return;
        }

        const redirectTarget = accessRedirect(me.user, mode === "admin" ? "admin" : undefined);

        if (redirectTarget) {
          router.replace(redirectTarget);
          return;
        }

        setState({
          status: "ready",
          user: me.user
        });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          try {
            await authApi.refresh();
            const me = await authApi.me();

            if (!isMounted) {
              return;
            }

            const redirectTarget = accessRedirect(me.user, mode === "admin" ? "admin" : undefined);

            if (redirectTarget) {
              router.replace(redirectTarget);
              return;
            }

            setState({
              status: "ready",
              user: me.user
            });
            return;
          } catch {
            router.replace("/login");
            return;
          }
        }

        setState({
          status: "error",
          message: "Unable to load the current session."
        });
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [mode, router]);

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
        ? "This placeholder will later hold company hiring and milestone workflows."
        : isAdmin
          ? "This placeholder confirms admin accounts can also pass the standard dashboard guard."
          : "This placeholder will later hold job applications, milestones, and earnings history.";

  return (
    <section className="shell-card">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub</p>
          <h1>{heading}</h1>
        </div>
        <LogoutButton />
      </div>

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

      <p className="muted">{summary}</p>
    </section>
  );
};

export { accessRedirect };
