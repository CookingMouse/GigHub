"use client";

import Link from "next/link";
import React, { type ReactNode } from "react";
import { LogoutButton } from "./logout-button";

type FreelancerWorkspaceShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  freelancerName: string;
  freelancerEmail: string;
  actions?: ReactNode;
};

export const FreelancerWorkspaceShell = ({
  title,
  description,
  children,
  freelancerName,
  freelancerEmail,
  actions
}: FreelancerWorkspaceShellProps) => {
  return (
    <section className="shell-card shell-card-wide">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub Freelancer</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <div className="header-action-group">
          <Link className="button-secondary" href="/dashboard">
            Dashboard
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="status-grid">
        <article className="status-panel">
          <span className="panel-label">Freelancer</span>
          <strong>{freelancerName}</strong>
          <p>{freelancerEmail}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Workflow</span>
          <strong>Review milestones - Upload - Submit</strong>
          <p>Each milestone supports one primary file per revision, up to three revisions.</p>
        </article>
      </div>

      {actions ? <div className="action-row">{actions}</div> : null}

      {children}
    </section>
  );
};
