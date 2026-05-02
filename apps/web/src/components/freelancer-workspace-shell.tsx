"use client";

import React, { type ReactNode } from "react";
import { WorkspaceLayout } from "./workspace-layout";

type FreelancerWorkspaceShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  freelancerName: string;
  freelancerEmail: string;
  actions?: ReactNode;
  hideFreelancerCard?: boolean;
  hideWorkflowCard?: boolean;
};

export const FreelancerWorkspaceShell = ({
  title,
  description,
  children,
  freelancerName,
  freelancerEmail,
  actions,
  hideFreelancerCard = false,
  hideWorkflowCard = false
}: FreelancerWorkspaceShellProps) => {
  return (
    <WorkspaceLayout
      title={title}
      subtitle={description}
      user={{ id: "freelancer-shell", email: freelancerEmail, name: freelancerName, role: "freelancer" }}
    >
      {hideFreelancerCard && hideWorkflowCard ? null : (
        <div className="status-grid">
          {!hideFreelancerCard && (
            <article className="status-panel">
              <span className="panel-label">Freelancer</span>
              <strong>{freelancerName}</strong>
              <p>{freelancerEmail}</p>
            </article>
          )}

          {!hideWorkflowCard && (
            <article className="status-panel">
              <span className="panel-label">Workflow</span>
              <strong>Review milestones - Upload - Submit</strong>
              <p>Each milestone supports one primary file per revision, up to three revisions.</p>
            </article>
          )}
        </div>
      )}

      {actions ? <div className="action-row">{actions}</div> : null}

      {children}
    </WorkspaceLayout>
  );
};
