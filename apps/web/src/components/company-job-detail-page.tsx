"use client";

import type { FreelancerDirectoryRecord, JobRecord, MockPaymentIntentRecord } from "@gighub/shared";
import { ZodError } from "zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, freelancersApi, jobsApi, paymentsApi } from "@/lib/api";
import {
  jobFormValuesToInput,
  jobRecordToFormValues,
  serializeJobFormValues,
  type JobFormValues
} from "@/lib/job-form";
import {
  applyHalfSplit,
  createDefaultMilestonePlanValues,
  milestoneFormValuesToInput,
  milestoneRecordsToFormValues,
  type MilestoneFormValue
} from "@/lib/milestone-plan";
import { CompanyWorkspaceShell } from "./company-workspace-shell";
import { JobDraftForm } from "./job-draft-form";
import { MilestonePlanForm } from "./milestone-plan-form";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobRecord };

type FreelancerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; freelancers: FreelancerDirectoryRecord[] };

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const CompanyJobDetailPage = () => {
  const session = useProtectedUser("company");
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;

  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });
  const [freelancerState, setFreelancerState] = useState<FreelancerState>({ status: "loading" });
  const [values, setValues] = useState<JobFormValues | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [latestIntent, setLatestIntent] = useState<MockPaymentIntentRecord | null>(null);
  const [milestoneValues, setMilestoneValues] = useState<MilestoneFormValue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [assigningFreelancerId, setAssigningFreelancerId] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isSavingMilestones, setIsSavingMilestones] = useState(false);

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

        syncJob(response.job);
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

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    let isMounted = true;

    const loadFreelancers = async () => {
      try {
        const response = await freelancersApi.list();

        if (!isMounted) {
          return;
        }

        setFreelancerState({
          status: "ready",
          freelancers: response.freelancers
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFreelancerState({
          status: "error",
          message:
            error instanceof ApiRequestError
              ? error.message
              : "Unable to load freelancer profiles right now."
        });
      }
    };

    void loadFreelancers();

    return () => {
      isMounted = false;
    };
  }, [session.status]);

  const syncJob = (job: JobRecord) => {
    const formValues = jobRecordToFormValues(job);

    setDetailState({
      status: "ready",
      job
    });
    setValues(formValues);
    setSavedSnapshot(serializeJobFormValues(formValues));
    setMilestoneValues(milestoneRecordsToFormValues(job.milestones, job.milestoneCount));
    setLatestIntent(
      job.escrow?.provider === "mock" && job.escrow.providerReference
        ? {
            intentId: job.escrow.providerReference,
            amount: job.budget,
            currency: "MYR",
            provider: "mock",
            status: job.escrow.status === "FUNDED" ? "succeeded" : "requires_confirmation"
          }
        : null
    );
  };

  if (session.status === "loading") {
    return (
      <section className="shell-card">
        <p className="eyebrow">GigHub</p>
        <h1>Loading company workspace</h1>
        <p className="muted">Restoring the job workflow and transaction state.</p>
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
        description="Loading the job, the validation state, and the current transaction progress."
        title="Job details"
      >
        <section className="inline-panel">
          <h2>Loading job</h2>
          <p className="muted">Pulling the current draft, escrow state, and milestone plan.</p>
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

  const escrowIntentId = latestIntent?.intentId ?? job.escrow?.providerReference ?? null;
  const canAssignFreelancer = job.status === "OPEN";
  const canCreateEscrowIntent = job.status === "ASSIGNED" && !escrowIntentId;
  const canSimulateFunding = job.status === "ASSIGNED" && Boolean(escrowIntentId);
  const canEditMilestones = job.status === "ESCROW_FUNDED";
  const showMilestones = job.status === "ESCROW_FUNDED" || job.status === "IN_PROGRESS";

  const updateField = (field: keyof JobFormValues, value: string) => {
    setSaveError(null);
    setValidationError(null);
    setValues((current) =>
      current
        ? {
            ...current,
            [field]: value
          }
        : current
    );
  };

  const updateMilestoneField = (
    index: number,
    field: keyof MilestoneFormValue,
    value: string
  ) => {
    setMilestoneError(null);
    setMilestoneValues((current) =>
      current.map((milestone, milestoneIndex) =>
        milestoneIndex === index
          ? {
              ...milestone,
              [field]: value
            }
          : milestone
      )
    );
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setValidationError(null);

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
    setValidationError(null);
    setSaveError(null);
    setIsValidating(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.validate(job.id);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setValidationError(error.message);
        } else {
          setValidationError("Unable to validate the brief right now.");
        }
      } finally {
        setIsValidating(false);
      }
    });
  };

  const handlePublish = () => {
    setValidationError(null);
    setSaveError(null);
    setIsPublishing(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.publish(job.id);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setValidationError(error.message);
        } else {
          setValidationError("Unable to publish the job right now.");
        }
      } finally {
        setIsPublishing(false);
      }
    });
  };

  const handleAssignFreelancer = (freelancerId: string) => {
    setAssignmentError(null);
    setAssigningFreelancerId(freelancerId);

    startTransition(async () => {
      try {
        const response = await jobsApi.assign(job.id, {
          freelancerId
        });
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setAssignmentError(error.message);
        } else {
          setAssignmentError("Unable to assign the freelancer right now.");
        }
      } finally {
        setAssigningFreelancerId(null);
      }
    });
  };

  const handleCreateEscrowIntent = () => {
    setFundingError(null);
    setIsCreatingIntent(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.createEscrowIntent(job.id);
        setLatestIntent(response.intent);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setFundingError(error.message);
        } else {
          setFundingError("Unable to create the mock payment intent right now.");
        }
      } finally {
        setIsCreatingIntent(false);
      }
    });
  };

  const handleSimulateFunding = () => {
    if (!escrowIntentId) {
      setFundingError("Create a mock payment intent before simulating payment success.");
      return;
    }

    setFundingError(null);
    setIsSimulatingPayment(true);

    startTransition(async () => {
      try {
        const response = await paymentsApi.simulateSuccess(
          escrowIntentId,
          `mock_evt_${crypto.randomUUID()}`
        );
        syncJob(response.job);
        setLatestIntent((current) =>
          current
            ? {
                ...current,
                status: "succeeded"
              }
            : current
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setFundingError(error.message);
        } else {
          setFundingError("Unable to simulate payment success right now.");
        }
      } finally {
        setIsSimulatingPayment(false);
      }
    });
  };

  const handleApplyHalfSplit = () => {
    setMilestoneError(null);
    setMilestoneValues((current) => applyHalfSplit(job.budget, current));
  };

  const handleSaveMilestones = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMilestoneError(null);

    let payload;

    try {
      payload = milestoneFormValuesToInput(milestoneValues);
    } catch (error) {
      if (error instanceof ZodError) {
        setMilestoneError(error.issues[0]?.message ?? "Check the milestone plan before saving.");
        return;
      }

      setMilestoneError("Unable to prepare the milestone plan.");
      return;
    }

    setIsSavingMilestones(true);

    startTransition(async () => {
      try {
        const response = await jobsApi.saveMilestones(job.id, payload);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setMilestoneError(error.message);
        } else {
          setMilestoneError("Unable to save the milestones right now.");
        }
      } finally {
        setIsSavingMilestones(false);
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
      description="Move the job from publish to assignment, escrow funding, and milestone setup in one controlled company workflow."
      title={job.title}
    >
      <div className="workspace-grid">
        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Brief source</p>
              <h2>{isDraft ? "Edit draft" : "Published brief"}</h2>
            </div>
            {isDirty ? <span className="status-chip">Unsaved changes</span> : null}
          </div>

          {!isDraft ? (
            <p className="muted">
              This job is already published. The brief stays locked so assignment and funding happen
              against the same validated posting.
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
                <span className="helper-copy">
                  The brief is now read-only while the company completes assignment and funding.
                </span>
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
          <p className="muted">
            {validation.summary ?? "Run validation to see the brief score and feedback."}
          </p>

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
          {validationError ? <p className="form-error">{validationError}</p> : null}

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

      <div className="transaction-stack">
        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Assign freelancer</h2>
            </div>
            <span className="status-chip">{job.status}</span>
          </div>

          {job.assignedFreelancer ? (
            <div className="status-grid compact-grid">
              <article className="status-panel">
                <span className="panel-label">Assigned freelancer</span>
                <strong>{job.assignedFreelancer.displayName}</strong>
                <p>{job.assignedFreelancer.name}</p>
              </article>

              <article className="status-panel">
                <span className="panel-label">Assigned at</span>
                <strong>{formatDate(job.assignedAt)}</strong>
                <p>{job.assignedFreelancer.skills.join(", ") || "No skills listed yet."}</p>
              </article>
            </div>
          ) : null}

          {assignmentError ? <p className="form-error">{assignmentError}</p> : null}

          {canAssignFreelancer ? (
            <>
              {freelancerState.status === "loading" ? (
                <p className="muted">Loading freelancer profiles for assignment.</p>
              ) : null}

              {freelancerState.status === "error" ? (
                <p className="form-error">{freelancerState.message}</p>
              ) : null}

              {freelancerState.status === "ready" ? (
                <div className="directory-grid">
                  {freelancerState.freelancers.map((freelancer) => (
                    <article className="directory-card" key={freelancer.id}>
                      <p className="eyebrow">Freelancer</p>
                      <h3>{freelancer.displayName}</h3>
                      <p className="muted">
                        {freelancer.skills.length > 0
                          ? freelancer.skills.join(", ")
                          : "No skills listed yet."}
                      </p>
                      <p className="muted">
                        {freelancer.hourlyRate !== null
                          ? `${formatCurrency(freelancer.hourlyRate)} / hour`
                          : "Hourly rate not listed"}
                      </p>
                      {freelancer.portfolioUrl ? (
                        <a
                          className="button-secondary"
                          href={freelancer.portfolioUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View portfolio
                        </a>
                      ) : null}
                      <button
                        className="button-primary"
                        disabled={assigningFreelancerId !== null}
                        onClick={() => handleAssignFreelancer(freelancer.id)}
                        type="button"
                      >
                        {assigningFreelancerId === freelancer.id ? "Assigning..." : "Assign"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">
              {job.assignedFreelancer
                ? "Assignment is locked for this branch after a freelancer has been selected."
                : "Publish the job first before assigning a freelancer."}
            </p>
          )}
        </section>

        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Fund escrow</h2>
            </div>
          </div>

          <div className="status-grid compact-grid">
            <article className="status-panel">
              <span className="panel-label">Escrow status</span>
              <strong>{job.escrow?.status ?? "UNFUNDED"}</strong>
              <p>Funding is required before milestone setup can begin.</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Budget</span>
              <strong>{formatCurrency(job.budget)}</strong>
              <p>Full job amount is held in escrow for this workflow.</p>
            </article>

            <article className="status-panel">
              <span className="panel-label">Funded at</span>
              <strong>{formatDate(job.escrow?.fundedAt ?? null)}</strong>
              <p>Provider: {job.escrow?.provider ?? "mock"}</p>
            </article>
          </div>

          {fundingError ? <p className="form-error">{fundingError}</p> : null}

          <div className="action-row">
            <button
              className="button-secondary"
              disabled={!canCreateEscrowIntent || isCreatingIntent || isSimulatingPayment}
              onClick={handleCreateEscrowIntent}
              type="button"
            >
              {isCreatingIntent ? "Creating intent..." : "Create mock payment intent"}
            </button>
            <button
              className="button-primary"
              disabled={!canSimulateFunding || isCreatingIntent || isSimulatingPayment}
              onClick={handleSimulateFunding}
              type="button"
            >
              {isSimulatingPayment ? "Funding escrow..." : "Simulate payment success"}
            </button>
          </div>

          {escrowIntentId ? (
            <p className="helper-copy">Current mock intent: <code>{escrowIntentId}</code></p>
          ) : null}
        </section>

        <section className="inline-panel">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>Define milestones</h2>
            </div>
          </div>

          {!showMilestones ? (
            <p className="muted">
              Fund escrow first. The milestone builder only unlocks after payment has been confirmed.
            </p>
          ) : (
            <MilestonePlanForm
              disabled={!canEditMilestones}
              errorMessage={milestoneError}
              helperText={
                canEditMilestones
                  ? "Milestone amounts must add up to the funded job budget, and the count must match the published brief."
                  : "Milestones are locked once the job moves into progress."
              }
              isSubmitting={isSavingMilestones}
              milestones={milestoneValues}
              onApplyHalfSplit={job.milestoneCount === 2 && canEditMilestones ? handleApplyHalfSplit : undefined}
              onChange={updateMilestoneField}
              onSubmit={handleSaveMilestones}
              totalBudget={job.budget}
            />
          )}
        </section>
      </div>
    </CompanyWorkspaceShell>
  );
};
