"use client";

import type { JobRecord } from "@gighub/shared";
import { ZodError } from "zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, jobsApi } from "@/lib/api";
import {
  jobFormValuesToInput,
  jobRecordToFormValues,
  serializeJobFormValues,
  type JobFormValues
} from "@/lib/job-form";
import { CompanyWorkspaceShell } from "./company-workspace-shell";
import { JobDraftForm } from "./job-draft-form";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobRecord };

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const CompanyJobDetailPage = () => {
  const session = useProtectedUser("company");
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });
  const [values, setValues] = useState<JobFormValues | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadJob = async () => {
      try {
        const response = await jobsApi.get(jobId);

        if (!isMounted) {
          return;
        }

        const formValues = jobRecordToFormValues(response.job);

        setDetailState({
          status: "ready",
          job: response.job
        });
        setValues(formValues);
        setSavedSnapshot(serializeJobFormValues(formValues));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDetailState({
          status: "error",
          message: error instanceof ApiRequestError ? error.message : "Unable to load the job."
        });
      }
    };

    void loadJob();

    return () => {
      isMounted = false;
    };
  }, [jobId, session.status]);

  const syncJob = (job: JobRecord) => {
    const formValues = jobRecordToFormValues(job);
    setDetailState({
      status: "ready",
      job
    });
    setValues(formValues);
    setSavedSnapshot(serializeJobFormValues(formValues));
  };

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Restoring the draft editor and validation state.</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Workspace unavailable</h1>
        <p className="muted">{session.message}</p>
        <Link className="button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  }

  if (detailState.status === "loading" || !values) {
    return (
      <CompanyWorkspaceShell
        companyEmail={session.user.email}
        companyName={session.user.name}
        description="Loading the draft, the latest validation state, and publish eligibility."
        title="Job details"
      >
        <section className="inline-panel">
          <h2>Loading job</h2>
          <p className="muted">Pulling the current draft and validation state.</p>
        </section>
      </CompanyWorkspaceShell>
    );
  }

  if (detailState.status === "error") {
    return (
      <CompanyWorkspaceShell
        actions={
          <Link className="button-secondary" href="/jobs">
            Back to jobs
          </Link>
        }
        companyEmail={session.user.email}
        companyName={session.user.name}
        description="The job could not be loaded."
        title="Job details"
      >
        <section className="inline-panel">
          <h2>Job unavailable</h2>
          <p className="muted">{detailState.message}</p>
        </section>
      </CompanyWorkspaceShell>
    );
  }

  const job = detailState.job;
  const isDraft = job.status === "DRAFT";
  const isDirty = serializeJobFormValues(values) !== savedSnapshot;
  const validation = job.brief.validation;
  const publishBlockedReason = !isDraft
    ? "Published jobs are locked in this phase."
    : isDirty
      ? "Save the latest edits before validating or publishing."
      : validation.score === null
        ? "Run validation before publishing."
        : validation.isStale
          ? "Validation is outdated after recent edits."
          : !validation.canPublish
            ? "Resolve the flagged gaps until the score reaches the publish threshold."
            : null;

  const updateField = (field: keyof JobFormValues, value: string) => {
    setSaveError(null);
    setActionError(null);
    setValues((current) =>
      current
        ? {
            ...current,
            [field]: value
          }
        : current
    );
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setActionError(null);

    let payload;

    try {
      payload = jobFormValuesToInput(values);
    } catch (error) {
      if (error instanceof ZodError) {
        setSaveError(error.issues[0]?.message ?? "Check the draft fields before saving.");
        return;
      }

      setSaveError("Unable to prepare the draft payload.");
      return;
    }

    setIsSaving(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.update(job.id, payload);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setSaveError(error.message);
        } else {
          setSaveError("Unable to save the draft right now.");
        }
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleValidate = () => {
    setActionError(null);
    setSaveError(null);
    setIsValidating(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.validate(job.id);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setActionError(error.message);
        } else {
          setActionError("Unable to validate the brief right now.");
        }
      } finally {
        setIsValidating(false);
      }
    });
  };

  const handlePublish = () => {
    setActionError(null);
    setSaveError(null);
    setIsPublishing(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.publish(job.id);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setActionError(error.message);
        } else {
          setActionError("Unable to publish the job right now.");
        }
      } finally {
        setIsPublishing(false);
      }
    });
  };

  return (
    <CompanyWorkspaceShell
      actions={
        <>
          <Link className="button-secondary" href="/jobs">
            Back to jobs
          </Link>
          <Link className="button-secondary" href="/jobs/new">
            New draft
          </Link>
        </>
      }
      companyEmail={session.user.email}
      companyName={session.user.name}
      description="Save the brief, validate it against the structured requirements, then publish only when the validation is both fresh and strong enough."
      title={job.title}
    >
      <div className="workspace-grid">
        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Draft editor</p>
              <h2>{isDraft ? "Edit draft" : "Published job"}</h2>
            </div>
            {isDirty ? <span className="status-chip">Unsaved changes</span> : null}
          </div>

          {!isDraft ? (
            <p className="muted">
              This job is already published. Editing is locked in this phase so the validated brief
              stays aligned with the live posting.
            </p>
          ) : null}

          <JobDraftForm
            disabled={!isDraft}
            errorMessage={saveError}
            footer={
              isDraft ? (
                <span className="helper-copy">
                  Saving after validation will mark the existing validation as outdated.
                </span>
              ) : (
                <span className="helper-copy">Published jobs can be viewed here but not edited.</span>
              )
            }
            isSubmitting={isSaving}
            onChange={updateField}
            onSubmit={handleSave}
            submitLabel="Save draft"
            values={values}
          />
        </section>

        <aside className="inline-panel validation-panel">
          <p className="eyebrow">Validation</p>
          <h2>
            {validation.score === null ? "Not validated yet" : `${validation.score}/100 brief score`}
          </h2>
          <p className="muted">{validation.summary ?? "Run validation to see the brief score and feedback."}</p>

          <div className="validation-meta">
            <div>
              <span className="panel-label">Last validated</span>
              <strong>{formatDate(validation.lastValidatedAt)}</strong>
            </div>
            <div>
              <span className="panel-label">State</span>
              <strong>{validation.isStale ? "Outdated" : "Fresh"}</strong>
            </div>
          </div>

          {publishBlockedReason ? <p className="callout-warning">{publishBlockedReason}</p> : null}
          {actionError ? <p className="form-error">{actionError}</p> : null}

          <div className="action-row">
            <button
              className="button-secondary"
              disabled={!isDraft || isDirty || isSaving || isValidating || isPublishing}
              onClick={handleValidate}
              type="button"
            >
              {isValidating ? "Validating..." : "Validate brief"}
            </button>
            <button
              className="button-primary"
              disabled={Boolean(publishBlockedReason) || isSaving || isValidating || isPublishing}
              onClick={handlePublish}
              type="button"
            >
              {isPublishing ? "Publishing..." : "Publish job"}
            </button>
          </div>

          <div className="feedback-grid">
            <section>
              <span className="panel-label">Gaps</span>
              {validation.gaps.length > 0 ? (
                <ul className="feedback-list">
                  {validation.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No major gaps flagged.</p>
              )}
            </section>

            <section>
              <span className="panel-label">Clarifying questions</span>
              {validation.clarifyingQuestions.length > 0 ? (
                <ul className="feedback-list">
                  {validation.clarifyingQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No follow-up questions yet.</p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </CompanyWorkspaceShell>
  );
};
