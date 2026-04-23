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
  milestone.remainingRevisions === 0 ||
  ["UNDER_REVIEW", "APPROVED", "RELEASED", "DISPUTED"].includes(milestone.status);

const DecisionSummary = ({
  milestone
}: {
  milestone: FreelancerMilestoneDetailRecord;
}) => {
  const decision = milestone.latestDecision;
  const dispute = milestone.activeDispute;

  if (!decision && !dispute) {
    return null;
  }

  return (
    <section className="inline-panel">
      <p className="eyebrow">Decision intelligence</p>
      <h2>Latest GLM scoring and dispute state</h2>

      {decision ? (
        <>
          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">Milestone scoring</span>
              <strong>
                {decision.overallScore !== null ? `${decision.overallScore}/100` : "Pending"}
              </strong>
              <p>{decision.passFail ?? "No pass/fail verdict recorded yet."}</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Review deadline</span>
              <strong>{formatDate(milestone.reviewDueAt)}</strong>
              <p>
                {milestone.status === "UNDER_REVIEW"
                  ? "The company is inside the 72-hour review window."
                  : milestone.status === "REVISION_REQUESTED"
                    ? "The submission has been sent back for another revision."
                    : "Review timing is not active for the current milestone state."}
              </p>
            </article>
          </div>

          {decision.reasoning ? <p className="muted">{decision.reasoning}</p> : null}

          {decision.requirementScores.length > 0 ? (
            <ul className="feedback-list">
              {decision.requirementScores.map((score) => (
                <li key={`${score.requirement}-${score.score}`}>
                  {score.requirement.replace(/_/g, " ")}: {score.score}/100
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {milestone.status === "REVISION_REQUESTED" ? (
        <p className="callout-warning">
          Mocked GLM did not clear this revision for company review. Update the deliverable and
          resubmit while revisions remain.
        </p>
      ) : null}

      {milestone.status === "UNDER_REVIEW" ? (
        <p className="helper-copy">
          This revision passed mocked GLM scoring and is waiting for company approval, rejection, or
          auto-release.
        </p>
      ) : null}

      {dispute ? (
        <div className="callout-warning">
          <strong>Dispute status: {dispute.status}</strong>
          <p>{dispute.rejectionReason}</p>
          {dispute.latestDecision?.recommendation ? (
            <p className="muted">
              Mocked GLM recommendation: {dispute.latestDecision.recommendation}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

const SubmissionHistoryList = ({
  milestone
}: {
  milestone: FreelancerMilestoneDetailRecord;
}) => (
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
            <strong>{submission.fileName ?? "Submission file"}</strong>
            <p>
              {submission.fileFormat?.toUpperCase() ?? "Unknown"} · {submission.status} ·{" "}
              {formatDate(submission.submittedAt)}
            </p>
            <p className="muted">
              {submission.fileSizeBytes !== null
                ? `${submission.fileSizeBytes.toLocaleString()} bytes`
                : "File size unavailable"}
              {submission.wordCount !== null ? ` · ${submission.wordCount} words` : ""}
              {submission.dimensions ? ` · ${submission.dimensions}` : ""}
            </p>
            {submission.notes ? <p className="muted">{submission.notes}</p> : null}
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
        description="Loading the brief summary, milestone requirements, and current submission history."
        freelancerEmail={user.email}
        freelancerName={user.name}
        title="Milestone detail"
      >
        <section className="inline-panel">
          <h2>Loading milestone</h2>
          <p className="muted">Pulling the current milestone state and confidential submission history.</p>
        </section>
      </FreelancerWorkspaceShell>
    );
  }

  if (state.status === "error") {
    return (
      <FreelancerWorkspaceShell
        actions={
          <Link className="button-secondary" href="/dashboard">
            Back to dashboard
          </Link>
        }
        description="The requested milestone could not be loaded."
        freelancerEmail={user.email}
        freelancerName={user.name}
        title="Milestone detail"
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
        <Link className="button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      }
      description="Review the accepted brief, upload one confidential file, and keep the submission history attached to the milestone."
      freelancerEmail={user.email}
      freelancerName={user.name}
      title={milestone.title}
    >
      <div className="workspace-grid">
        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Milestone</p>
              <h2>{milestone.job.title}</h2>
            </div>
            <span className="status-chip">{milestone.status}</span>
          </div>

          <p className="muted">
            {milestone.job.companyName} · Milestone {milestone.sequence}
          </p>
          <p>{milestone.description || "No additional milestone description was provided."}</p>

          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">Due at</span>
              <strong>{formatDate(milestone.dueAt)}</strong>
              <p>Keep the delivery inside the milestone window.</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Revision usage</span>
              <strong>
                {milestone.revisionCount} / 3
              </strong>
              <p>{milestone.remainingRevisions} revision(s) remaining in this phase.</p>
            </article>
          </div>
        </section>

        <section className="inline-panel">
          <p className="eyebrow">Brief summary</p>
          <h2>What this milestone is judged against</h2>
          <p>{milestone.brief.overview || "No brief overview is available for this milestone yet."}</p>

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
                <p className="muted">No deliverables were listed on the brief.</p>
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
                <p className="muted">No acceptance criteria were listed on the brief.</p>
              )}
            </section>
          </div>
        </section>
      </div>

      <DecisionSummary milestone={milestone} />

      <section className="inline-panel">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Submit</p>
            <h2>Upload milestone deliverable</h2>
          </div>
        </div>

        {locked ? (
          <p className="callout-warning">
            {milestone.remainingRevisions === 0
              ? "The three-revision limit has been reached for this milestone."
              : "This milestone is locked for further submissions."}
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
