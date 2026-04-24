"use client";

import React, { type ReactNode } from "react";
import { WorkspaceLayout } from "./workspace-layout";

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
    <WorkspaceLayout
      title={title}
      subtitle={description}
      user={{ id: "company-shell", email: companyEmail, name: companyName, role: "company" }}
    >
      <div className="status-grid">
        <article className="status-panel">
          <span className="panel-label">Company</span>
          <strong>{companyName}</strong>
          <p>{companyEmail}</p>
        </article>

        <article className="status-panel">
          <span className="panel-label">Workflow</span>
          <strong>Draft - Validate - Hire - Manage</strong>
          <p>Structured briefs lead to AI-validated milestones and secure escrow releases.</p>
        </article>
      </div>

      {actions ? <div className="action-row">{actions}</div> : null}

      {children}
    </WorkspaceLayout>
  );
};
