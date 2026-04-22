"use client";

import Link from "next/link";
import React, { type ReactNode } from "react";
import { LogoutButton } from "./logout-button";

type CompanyWorkspaceShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  companyName: string;
  companyEmail: string;
};

export const CompanyWorkspaceShell = ({
  title,
  description,
  children,
  actions,
  companyName,
  companyEmail
}: CompanyWorkspaceShellProps) => {
  return (
    <section className="shell-card shell-card-wide">
      <div className="shell-header">
        <div>
          <p className="eyebrow">GigHub Company</p>
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
          <span className="panel-label">Company</span>
          <strong>{companyName}</strong>
          <p>{companyEmail}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Workflow</span>
          <strong>Draft - Validate - Publish</strong>
          <p>Edits after validation require a fresh validation before the job can go live.</p>
        </article>
      </div>

      {actions ? <div className="action-row">{actions}</div> : null}

      {children}
    </section>
  );
};
