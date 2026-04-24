"use client";

import type { FreelancerDirectoryRecord, JobRecord, MockPaymentIntentRecord } from "@gighub/shared";
import { ZodError } from "zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { startTransition, useEffect, useState } from "react";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { ApiRequestError, freelancersApi, jobsApi, paymentsApi, profileApi } from "@/lib/api";
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
import { EscrowStatusHeader } from "./escrow-status-header";

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
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [actingReviewMilestoneId, setActingReviewMilestoneId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "auto-release" | null>(null);

  const handleDownloadResume = async (freelancerId: string) => {
    try {
      const { blob, fileName } = await profileApi.downloadFreelancerResume(freelancerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setAssignmentError(
        error instanceof ApiRequestError ? error.message : "Unable to download resume right now."
      );
    }
  };

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

  const updateRejectReason = (milestoneId: string, value: string) => {
    setReviewError(null);
    setRejectReasons((current) => ({
      ...current,
      [milestoneId]: value
    }));
  };

  const handleApproveMilestone = (milestoneId: string) => {
    setReviewError(null);
    setActingReviewMilestoneId(milestoneId);
    setReviewAction("approve");

    startTransition(async () => {
      try {
        const response = await jobsApi.approveMilestone(job.id, milestoneId);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setReviewError(error.message);
        } else {
          setReviewError("Unable to approve the milestone right now.");
        }
      } finally {
        setActingReviewMilestoneId(null);
        setReviewAction(null);
      }
    });
  };

  const handleRejectMilestone = (milestoneId: string) => {
    const rejectionReason = rejectReasons[milestoneId]?.trim() ?? "";

    if (rejectionReason.length < 10) {
      setReviewError("Add a specific rejection reason before opening a dispute.");
      return;
    }

    setReviewError(null);
    setActingReviewMilestoneId(milestoneId);
    setReviewAction("reject");

    startTransition(async () => {
      try {
        const response = await jobsApi.rejectMilestone(job.id, milestoneId, {
          rejectionReason
        });
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setReviewError(error.message);
        } else {
          setReviewError("Unable to reject the milestone right now.");
        }
      } finally {
        setActingReviewMilestoneId(null);
        setReviewAction(null);
      }
    });
  };

  const handleAutoReleaseCheck = (milestoneId: string) => {
    setReviewError(null);
    setActingReviewMilestoneId(milestoneId);
    setReviewAction("auto-release");

    startTransition(async () => {
      try {
        const response = await jobsApi.runAutoReleaseCheck(job.id, milestoneId);
        syncJob(response.job);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          setReviewError(error.message);
        } else {
          setReviewError("Unable to run the auto-release check right now.");
        }
      } finally {
        setActingReviewMilestoneId(null);
        setReviewAction(null);
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
      <EscrowStatusHeader budget={job.budget} escrow={job.escrow} role="company" />

      <div className="workspace-grid">
        <div className="workspace-column-main">
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

          {job.milestones.length > 0 ? (
            <section className="inline-panel">
              <div className="panel-heading-row">
                <div>
                  <p className="eyebrow">Milestone Progress</p>
                  <h2>Vertical Timeline</h2>
                </div>
              </div>
              <div className="card-stack">
                {job.milestones.map((milestone) => (
                  <article className="list-card" key={milestone.id}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: milestone.status === "RELEASED" ? "#0F6E56" : "#E5E7EB",
                          color: milestone.status === "RELEASED" ? "#fff" : "#6B7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}
                      >
                        {milestone.sequence}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <h3 style={{ margin: 0, fontSize: "14px" }}>{milestone.title}</h3>
                          <span className="status-chip">{milestone.status}</span>
                        </div>
                        <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "12px" }}>
                          {formatCurrency(milestone.amount)} · Due {formatDate(milestone.dueAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="workspace-column-sidebar">
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
          </aside>

          {/* Step 1: Assignment */}
          <section className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">Step 1</p>
                <h2>Assign freelancer</h2>
              </div>
            </div>

            {job.assignedFreelancer ? (
              <div className="status-panel">
                <span className="panel-label">Assigned to</span>
                <strong>{job.assignedFreelancer.displayName}</strong>
                <p className="muted" style={{ fontSize: "12px" }}>
                  {job.assignedFreelancer.email}
                </p>
              </div>
            ) : canAssignFreelancer ? (
              <div className="card-stack">
                {freelancerState.status === "ready" ? (
                  freelancerState.freelancers.map((f) => (
                    <article className="status-panel" key={f.id} style={{ padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>{f.displayName}</strong>
                          <p className="muted" style={{ fontSize: "11px", margin: 0 }}>{f.skills.slice(0, 3).join(", ")}</p>
                        </div>
                        <button
                          className="button-primary"
                          disabled={assigningFreelancerId !== null}
                          onClick={() => handleAssignFreelancer(f.id)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          type="button"
                        >
                          Assign
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted">Loading freelancers...</p>
                )}
              </div>
            ) : (
              <p className="muted">Complete validation to assign.</p>
            )}
            {assignmentError ? <p className="form-error">{assignmentError}</p> : null}
          </section>

          {/* Step 2: Escrow */}
          <section className="inline-panel">
            <div className="panel-heading-row">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>Escrow Funding</h2>
              </div>
            </div>
            
            <div className="status-panel">
              <span className="panel-label">Status</span>
              <strong>{job.escrow?.status ?? "UNFUNDED"}</strong>
            </div>

            {job.status === "ASSIGNED" && (
              <div className="action-row" style={{ marginTop: "12px" }}>
                <button
                  className="button-secondary"
                  disabled={!canCreateEscrowIntent || isCreatingIntent}
                  onClick={handleCreateEscrowIntent}
                  style={{ flex: 1 }}
                  type="button"
                >
                  {isCreatingIntent ? "..." : "Setup Payment"}
                </button>
                <button
                  className="button-primary"
                  disabled={!canSimulateFunding || isSimulatingPayment}
                  onClick={handleSimulateFunding}
                  style={{ flex: 1 }}
                  type="button"
                >
                  {isSimulatingPayment ? "Funding..." : "Simulate Pay"}
                </button>
              </div>
            )}
            {fundingError ? <p className="form-error">{fundingError}</p> : null}
          </section>

          {/* Step 3: Milestones */}
          {showMilestones && (
            <section className="inline-panel">
              <div className="panel-heading-row">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>Milestone Setup</h2>
                </div>
              </div>
              <MilestonePlanForm
                disabled={!canEditMilestones}
                errorMessage={milestoneError}
                isSubmitting={isSavingMilestones}
                milestones={milestoneValues}
                onChange={updateMilestoneField}
                onSubmit={handleSaveMilestones}
                totalBudget={job.budget}
              />
            </section>
          )}

          {/* Step 4: Reviews */}
          {job.milestones.some(m => m.latestSubmission) && (
            <section className="inline-panel">
              <div className="panel-heading-row">
                <div>
                  <p className="eyebrow">Step 4</p>
                  <h2>Active Reviews</h2>
                </div>
              </div>
              {reviewError ? <p className="form-error">{reviewError}</p> : null}
              <div className="card-stack">
                {job.milestones.filter(m => m.status === "UNDER_REVIEW").map(m => {
                   const isActing = actingReviewMilestoneId === m.id;
                   return (
                    <article className="list-card" key={m.id} style={{ padding: "12px" }}>
                      <strong>{m.title}</strong>
                      <p className="muted" style={{ fontSize: "12px", marginBottom: "10px" }}>{m.latestSubmission?.fileName}</p>
                      <div className="action-row">
                        <button
                          className="button-primary"
                          disabled={isActing}
                          onClick={() => handleApproveMilestone(m.id)}
                          style={{ padding: "6px 10px", fontSize: "12px" }}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          className="button-secondary"
                          disabled={isActing}
                          onClick={() => handleAutoReleaseCheck(m.id)}
                          style={{ padding: "6px 10px", fontSize: "12px" }}
                          type="button"
                        >
                          Auto
                        </button>
                      </div>
                    </article>
                   );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </CompanyWorkspaceShell>
  );
};
