"use client";

import type { FreelancerMilestoneDetailRecord, PublicUser } from "@gighub/shared";
import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, freelancerWorkspaceApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { FreelancerSubmissionForm } from "./freelancer-submission-form";
import { FreelancerWorkspaceShell } from "./freelancer-workspace-shell";

type FreelancerMilestoneDetailPageProps = {
  milestoneId: string;
};

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; milestone: FreelancerMilestoneDetailRecord };

const freelancerAccent = "#0F6E56";

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const isSubmissionLocked = (milestone: FreelancerMilestoneDetailRecord) =>
  ["UNDER_REVIEW", "APPROVED", "RELEASED", "DISPUTED"].includes(milestone.status);


const SubmissionHistoryList = ({ milestone }: { milestone: FreelancerMilestoneDetailRecord }) => (
  <section className="inline-panel">
    <p className="eyebrow">Submission history</p>
    <h2>Prior revisions</h2>

    {milestone.submissionHistory.length === 0 ? (
      <p className="muted">No submissions yet. Upload the first revision from this page.</p>
    ) : (
      <div className="card-stack">
        {milestone.submissionHistory.map((submission) => (
          <article className="status-panel" key={submission.id}>
            <span className="panel-label">Revision {submission.revision}</span>
            <strong className="freelancer-milestone-detail-card-title">
              {submission.fileName ?? "Submission file"}
            </strong>
            <p className="freelancer-milestone-detail-meta">
              {submission.fileFormat?.toUpperCase() ?? "Unknown"} | {submission.status} |{" "}
              {formatDate(submission.submittedAt)}
            </p>
            <p className="muted freelancer-milestone-detail-supporting-copy">
              {submission.fileSizeBytes !== null
                ? `${submission.fileSizeBytes.toLocaleString()} bytes`
                : "File size unavailable"}
              {submission.wordCount !== null ? ` | ${submission.wordCount} words` : ""}
              {submission.dimensions ? ` | ${submission.dimensions}` : ""}
            </p>
            {submission.notes ? (
              <p className="muted freelancer-milestone-detail-supporting-copy">{submission.notes}</p>
            ) : null}
            {submission.rejectionReason ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  borderLeft: "3px solid #B45309",
                  backgroundColor: "#FEF3C7"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#B45309",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  Company feedback
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#7C2D12", lineHeight: 1.55 }}>
                  {submission.rejectionReason}
                </p>
                {submission.reviewedAt ? (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#92400E" }}>
                    Reviewed {formatDate(submission.reviewedAt)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    )}
  </section>
);

const FreelancerMilestoneDetailContent = ({
  milestoneId,
  user
}: {
  milestoneId: string;
  user: PublicUser;
}) => {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMilestone = async () => {
      try {
        const response = await freelancerWorkspaceApi.getMilestone(milestoneId);

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          milestone: response.milestone
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof ApiRequestError
              ? error.message
              : "Unable to load the milestone details right now."
        });
      }
    };

    void loadMilestone();

    return () => {
      isMounted = false;
    };
  }, [milestoneId]);

  if (state.status === "loading") {
    return (
      <FreelancerWorkspaceShell
        description="Loading milestone details..."
        freelancerEmail={user.email}
        freelancerName={user.name}
        hideFreelancerCard
        hideWorkflowCard
        title="Milestone details"
      >
        <section className="inline-panel">
          <h2>Loading details...</h2>
        </section>
      </FreelancerWorkspaceShell>
    );
  }

  if (state.status === "error") {
    return (
      <FreelancerWorkspaceShell
        actions={
          <Link
            className="button-primary"
            style={{ backgroundColor: freelancerAccent }}
            href="/freelancer/active-jobs"
          >
            Back to active work
          </Link>
        }
        description="Error"
        freelancerEmail={user.email}
        freelancerName={user.name}
        hideFreelancerCard
        hideWorkflowCard
        title="Milestone details"
      >
        <section className="inline-panel">
          <h2>Milestone unavailable</h2>
          <p className="form-error">{state.message}</p>
        </section>
      </FreelancerWorkspaceShell>
    );
  }

  const { milestone } = state;
  const locked = isSubmissionLocked(milestone);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!file) {
      setSubmitError("Choose one supported file before submitting the milestone.");
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const response = await freelancerWorkspaceApi.createSubmission(milestone.id, {
          file,
          notes
        });
        setState({
          status: "ready",
          milestone: response.milestone
        });
        setFile(null);
        setNotes("");
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setSubmitError(error.message);
        } else {
          setSubmitError("Unable to submit the milestone right now.");
        }
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <FreelancerWorkspaceShell
      actions={
        <Link
          className="button-primary"
          style={{ backgroundColor: freelancerAccent }}
          href="/freelancer/active-jobs"
        >
          Back to active work
        </Link>
      }
      description={`Job: ${milestone.job.title}`}
      freelancerEmail={user.email}
      freelancerName={user.name}
      hideFreelancerCard
      hideWorkflowCard
      title="Milestone Workroom"
    >
      <div className="freelancer-milestone-detail-layout">
        <div className="workspace-grid">
          <section className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">Active Milestone</p>
                <h2>{milestone.title}</h2>
              </div>
              <span className="status-chip">{milestone.status}</span>
            </div>

            <p className="muted freelancer-milestone-detail-meta">
              {milestone.job.companyName} | Milestone {milestone.sequence}
            </p>
            <p className="freelancer-milestone-detail-body">
              {milestone.description || "No additional milestone description was provided."}
            </p>

            <div className="status-grid compact-grid">
              <article className="status-panel">
                <span className="panel-label">Due Date</span>
                <strong className="freelancer-milestone-detail-metric-value">
                  {formatDate(milestone.dueAt)}
                </strong>
                <p className="freelancer-milestone-detail-supporting-copy">
                  Keep the delivery inside the milestone window.
                </p>
              </article>
            </div>
          </section>

          <section className="inline-panel" style={{ borderTop: `4px solid ${freelancerAccent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Escrow Monitor</h2>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                backgroundColor: milestone.status === "RELEASED" ? "#ECFDF5" : milestone.status === "APPROVED" ? "#E1F5EE" : "#FFFBEB",
                color: milestone.status === "RELEASED" ? "#059669" : milestone.status === "APPROVED" ? "#0F6E56" : "#D97706"
              }}>
                {milestone.status === "RELEASED" ? "RELEASED" : milestone.status === "APPROVED" ? "APPROVED" : "LOCKED IN ESCROW"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 20 }}>
              <article>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Milestone Payment</span>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>
                  RM {milestone.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </article>
              <article>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Locked in Escrow</span>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#D97706" }}>
                  {milestone.status === "RELEASED"
                    ? "RM 0.00"
                    : `RM ${milestone.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </article>
              <article>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Released to You</span>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#059669" }}>
                  {milestone.status === "RELEASED"
                    ? `RM ${milestone.amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "RM 0.00"}
                </p>
              </article>
            </div>

            <div style={{ height: 12, backgroundColor: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: milestone.status === "RELEASED" ? "100%" : "0%",
                backgroundColor: "#059669",
                transition: "width 0.6s ease"
              }} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6B7280" }}>
              {milestone.status === "RELEASED"
                ? "Payment has been released to your wallet."
                : "Payment will be released once the company approves your submission."}
            </p>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Requirements</p>
            <h2>Milestone accepted brief</h2>
            <p className="freelancer-milestone-detail-body">
              {milestone.brief.overview || "No brief overview is available."}
            </p>

            <div className="feedback-grid">
              <section>
                <span className="panel-label">Deliverables</span>
                {milestone.brief.deliverables.length > 0 ? (
                  <ul className="feedback-list">
                    {milestone.brief.deliverables.map((deliverable) => (
                      <li key={deliverable}>{deliverable}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No deliverables listed.</p>
                )}
              </section>

              <section>
                <span className="panel-label">Acceptance criteria</span>
                {milestone.brief.acceptanceCriteria.length > 0 ? (
                  <ul className="feedback-list">
                    {milestone.brief.acceptanceCriteria.map((criterion) => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No criteria listed.</p>
                )}
              </section>
            </div>
          </section>
        </div>

        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Workroom</p>
              <h2>Upload milestone deliverable</h2>
            </div>
          </div>

          {locked ? (
            <p className="callout-warning">
              This milestone is currently under review or completed.
            </p>
          ) : null}

          <FreelancerSubmissionForm
            disabled={locked}
            errorMessage={submitError}
            file={file}
            isSubmitting={isSubmitting}
            notes={notes}
            onFileChange={setFile}
            onNotesChange={setNotes}
            onSubmit={handleSubmit}
          />
        </section>


        <SubmissionHistoryList milestone={milestone} />
      </div>
    </FreelancerWorkspaceShell>
  );
};

export const FreelancerMilestoneDetailPage = ({
  milestoneId
}: FreelancerMilestoneDetailPageProps) => {
  const session = useProtectedUser("freelancer");

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Checking your session</h1>
        <p className="muted">Restoring the freelancer workspace.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Session unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/login">
          Back to login
        </Link>
      </section>
    );
  }

  return <FreelancerMilestoneDetailContent milestoneId={milestoneId} user={session.user} />;
};
