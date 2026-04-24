"use client";

import type { FreelancerDirectoryRecord, JobRecord, MockPaymentIntentRecord, MilestoneStatus, AppRole } from "@gighub/shared";
import { ZodError } from "zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { startTransition, useEffect, useState, useMemo } from "react";
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

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobRecord };

type FreelancerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; freelancers: FreelancerDirectoryRecord[] };

type ActiveTab = "overview" | "milestones" | "review";

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

const companyAccent = "#1D4ED8";

// ── Components ────────────────────────────────────────────────────────────────

const EscrowMonitor = ({ job }: { job: JobRecord }) => {
  const fundedAmount = job.escrow?.fundedAmount ?? 0;
  const releasedAmount = job.escrow?.releasedAmount ?? 0;
  const lockedAmount = fundedAmount - releasedAmount;
  const totalBudget = job.budget;
  const fundedPercent = totalBudget > 0 ? (fundedAmount / totalBudget) * 100 : 0;
  const releasedPercent = totalBudget > 0 ? (releasedAmount / totalBudget) * 100 : 0;

  return (
    <section className="inline-panel" style={{ marginBottom: 24, borderTop: `4px solid ${companyAccent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Escrow Monitor</h2>
        <span style={{ 
          fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
          backgroundColor: job.escrow?.status === "FUNDED" ? "#ECFDF5" : "#FFFBEB",
          color: job.escrow?.status === "FUNDED" ? "#059669" : "#D97706"
        }}>
          {job.escrow?.status || "UNFUNDED"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 20 }}>
        <article>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Total Budget</span>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>{formatCurrency(totalBudget)}</p>
        </article>
        <article>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Funded in Escrow</span>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: companyAccent }}>{formatCurrency(fundedAmount)}</p>
        </article>
        <article>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Locked (In-Progress)</span>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#D97706" }}>{formatCurrency(lockedAmount)}</p>
        </article>
        <article>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Released to Worker</span>
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#059669" }}>{formatCurrency(releasedAmount)}</p>
        </article>
      </div>

      <div style={{ height: 12, backgroundColor: "#F3F4F6", borderRadius: 99, overflow: "hidden", position: "relative" }}>
        <div style={{ 
          position: "absolute", left: 0, top: 0, bottom: 0, 
          width: `${releasedPercent}%`, backgroundColor: "#059669", transition: "width 0.6s ease", zIndex: 2
        }} />
        <div style={{ 
          position: "absolute", left: 0, top: 0, bottom: 0, 
          width: `${fundedPercent}%`, backgroundColor: companyAccent + "40", transition: "width 0.6s ease", zIndex: 1
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Progress: {Math.round(releasedPercent)}% released</span>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Coverage: {Math.round(fundedPercent)}% funded</span>
      </div>
    </section>
  );
};

// ── Main Page Component ──────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  
  // Errors
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [assigningFreelancerId, setAssigningFreelancerId] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isSavingMilestones, setIsSavingMilestones] = useState(false);

  // Review states
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [actingReviewMilestoneId, setActingReviewMilestoneId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "auto-release" | null>(null);

  useEffect(() => {
    if (session.status !== "ready") return;
    let isMounted = true;
    const loadJob = async () => {
      try {
        const response = await jobsApi.get(jobId);
        if (!isMounted) return;
        syncJob(response.job);
      } catch (error) {
        if (!isMounted) return;
        setDetailState({ status: "error", message: error instanceof ApiRequestError ? error.message : "Unable to load the job." });
      }
    };
    void loadJob();
    return () => { isMounted = false; };
  }, [jobId, session.status]);

  useEffect(() => {
    if (session.status !== "ready") return;
    let isMounted = true;
    const loadFreelancers = async () => {
      try {
        const response = await freelancersApi.list();
        if (!isMounted) return;
        setFreelancerState({ status: "ready", freelancers: response.freelancers });
      } catch (error) {
        if (!isMounted) return;
        setFreelancerState({ status: "error", message: error instanceof ApiRequestError ? error.message : "Unable to load freelancer profiles." });
      }
    };
    void loadFreelancers();
    return () => { isMounted = false; };
  }, [session.status]);

  const syncJob = (job: JobRecord) => {
    const formValues = jobRecordToFormValues(job);
    setDetailState({ status: "ready", job });
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

  const handleDownloadResume = async (freelancerId: string) => {
    try {
      const { blob, fileName } = await profileApi.downloadFreelancerResume(freelancerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement("a"));
      a.href = url; a.download = fileName; a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (error) {
      setAssignmentError(error instanceof ApiRequestError ? error.message : "Unable to download resume.");
    }
  };

  if (session.status === "loading" || detailState.status === "loading" || !values) {
    return (
      <CompanyWorkspaceShell companyEmail={session.user.email} companyName={session.user.name} description="Organizing job workflow..." title="Job details">
        <section className="inline-panel"><h2>Loading job details...</h2></section>
      </CompanyWorkspaceShell>
    );
  }

  if (detailState.status === "error") {
    return (
      <CompanyWorkspaceShell companyEmail={session.user.email} companyName={session.user.name} description="Error" title="Job details">
        <section className="inline-panel"><h2>{detailState.message}</h2></section>
      </CompanyWorkspaceShell>
    );
  }

  const job = detailState.job;
  const isDraft = job.status === "DRAFT";
  const isDirty = serializeJobFormValues(values) !== savedSnapshot;
  const validation = job.brief.validation;
  const escrowIntentId = latestIntent?.intentId ?? job.escrow?.providerReference ?? null;
  const canAssignFreelancer = job.status === "OPEN";
  const canCreateEscrowIntent = job.status === "ASSIGNED" && !escrowIntentId;
  const canSimulateFunding = job.status === "ASSIGNED" && Boolean(escrowIntentId);
  const canEditMilestones = job.status === "ESCROW_FUNDED";
  const showMilestones = job.status === "ESCROW_FUNDED" || job.status === "IN_PROGRESS" || job.status === "COMPLETED" || job.status === "DISPUTED";

  // Handlers
  const updateField = (field: keyof JobFormValues, value: string) => {
    setSaveError(null); setValidationError(null);
    setValues(curr => curr ? { ...curr, [field]: value } : curr);
  };

  const updateMilestoneField = (index: number, field: keyof MilestoneFormValue, value: string) => {
    setMilestoneError(null);
    setMilestoneValues(curr => curr.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    startTransition(async () => {
      try {
        const response = await jobsApi.update(job.id, jobFormValuesToInput(values));
        syncJob(response.job);
      } catch (err: any) { setSaveError(err.message || "Failed to save."); } finally { setIsSaving(false); }
    });
  };

  const handleValidate = () => {
    setIsValidating(true);
    startTransition(async () => {
      try { const r = await jobsApi.validate(job.id); syncJob(r.job); } 
      catch (err: any) { setValidationError(err.message); } finally { setIsValidating(false); }
    });
  };

  const handlePublish = () => {
    setIsPublishing(true);
    startTransition(async () => {
      try { const r = await jobsApi.publish(job.id); syncJob(r.job); setActiveTab("overview"); } 
      catch (err: any) { setValidationError(err.message); } finally { setIsPublishing(false); }
    });
  };

  const handleAssignFreelancer = (id: string) => {
    setAssigningFreelancerId(id);
    startTransition(async () => {
      try { const r = await jobsApi.assign(job.id, { freelancerId: id }); syncJob(r.job); } 
      catch (err: any) { setAssignmentError(err.message); } finally { setAssigningFreelancerId(null); }
    });
  };

  const handleCreateEscrowIntent = () => {
    setIsCreatingIntent(true);
    startTransition(async () => {
      try { const r = await jobsApi.createEscrowIntent(job.id); setLatestIntent(r.intent); } 
      catch (err: any) { setFundingError(err.message); } finally { setIsCreatingIntent(false); }
    });
  };

  const handleSimulateFunding = () => {
    setIsSimulatingPayment(true);
    startTransition(async () => {
      try {
        const r = await paymentsApi.simulateSuccess(escrowIntentId!, `mock_evt_${crypto.randomUUID()}`);
        syncJob(r.job);
        setLatestIntent(curr => curr ? { ...curr, status: "succeeded" } : null);
      } catch (err: any) { setFundingError(err.message); } finally { setIsSimulatingPayment(false); }
    });
  };

  const handleSaveMilestones = (e: React.FormEvent) => {
    e.preventDefault(); setIsSavingMilestones(true);
    startTransition(async () => {
      try { const r = await jobsApi.saveMilestones(job.id, milestoneFormValuesToInput(milestoneValues)); syncJob(r.job); } 
      catch (err: any) { setMilestoneError(err.message); } finally { setIsSavingMilestones(false); }
    });
  };

  const handleApproveMilestone = (id: string) => {
    setActingReviewMilestoneId(id); setReviewAction("approve");
    startTransition(async () => {
      try { const r = await jobsApi.approveMilestone(job.id, id); syncJob(r.job); } 
      catch (err: any) { setReviewError(err.message); } finally { setActingReviewMilestoneId(null); setReviewAction(null); }
    });
  };

  const handleRejectMilestone = (id: string) => {
    const reason = rejectReasons[id]?.trim() ?? "";
    if (reason.length < 10) { setReviewError("Add a specific rejection reason."); return; }
    setActingReviewMilestoneId(id); setReviewAction("reject");
    startTransition(async () => {
      try { const r = await jobsApi.rejectMilestone(job.id, id, { rejectionReason: reason }); syncJob(r.job); } 
      catch (err: any) { setReviewError(err.message); } finally { setActingReviewMilestoneId(null); setReviewAction(null); }
    });
  };

  return (
    <CompanyWorkspaceShell
      actions={
        <div style={{ display: "flex", gap: 12 }}>
          <Link className="button-secondary" href="/jobs">Back to History</Link>
          <Link className="button-primary" style={{ backgroundColor: companyAccent }} href="/jobs/new">Post New Job</Link>
        </div>
      }
      companyEmail={session.user.email}
      companyName={session.user.name}
      description={`Job ID: ${job.id.slice(0, 8)}...`}
      title={job.title}
    >
      <EscrowMonitor job={job} />

      <nav style={{ display: "flex", gap: 24, marginBottom: 32, borderBottom: "1px solid #E5E7EB", paddingBottom: 2 }}>
        {(["overview", "milestones", "review"] as ActiveTab[]).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: activeTab === tab ? companyAccent : "#9CA3AF",
              borderBottom: activeTab === tab ? `2px solid ${companyAccent}` : "2px solid transparent",
              textTransform: "capitalize", transition: "all 0.2s"
            }}
          >
            {tab}
            {tab === "review" && job.milestones.filter(m => m.status === "SUBMITTED" || m.status === "UNDER_REVIEW").length > 0 && (
              <span style={{ marginLeft: 6, background: "#EF4444", color: "white", padding: "1px 6px", borderRadius: 10, fontSize: 10 }}>
                {job.milestones.filter(m => m.status === "SUBMITTED" || m.status === "UNDER_REVIEW").length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ minHeight: 400 }}>
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="workspace-grid">
            <section className="inline-panel">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Project Brief</h3>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Status: <strong>{job.status}</strong></span>
              </div>
              <JobDraftForm
                disabled={!isDraft} errorMessage={saveError} isSubmitting={isSaving}
                onChange={updateField} onSubmit={handleSave} submitLabel="Save Project Brief" values={values}
                footer={isDraft ? <span className="helper-copy">Edits require re-validation before publishing.</span> : null}
              />
            </section>

            <aside>
              <section className="inline-panel" style={{ marginBottom: 24 }}>
                <p className="eyebrow">Brief Validation</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>{validation.score === null ? "--" : `${validation.score}%`}</h2>
                  <span style={{ fontSize: 14, color: "#6B7280" }}>Quality Score</span>
                </div>
                {validation.summary && <p style={{ fontSize: 14, lineHeight: 1.5, color: "#4B5563", marginBottom: 16 }}>{validation.summary}</p>}
                
                <div className="action-row" style={{ marginTop: 20 }}>
                  <button className="button-secondary" disabled={!isDraft || isSaving || isValidating} onClick={handleValidate} style={{ flex: 1 }}>
                    {isValidating ? "Analyzing..." : "Run AI Validation"}
                  </button>
                  {isDraft && (
                    <button className="button-primary" style={{ backgroundColor: companyAccent, flex: 1 }} 
                            disabled={!validation.canPublish || isSaving || isPublishing} onClick={handlePublish}>
                      {isPublishing ? "Publishing..." : "Go Live"}
                    </button>
                  )}
                </div>
                {!validation.canPublish && isDraft && validation.score !== null && (
                  <p style={{ fontSize: 12, color: "#DC2626", marginTop: 12, background: "#FEF2F2", padding: 10, borderRadius: 8 }}>
                    Score must be at least 70% to publish. Address the gaps below.
                  </p>
                )}
              </section>

              {job.assignedFreelancer ? (
                <section className="inline-panel">
                  <h3 style={{ fontSize: 16, marginBottom: 16 }}>Assigned Talent</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: companyAccent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                    <div>
                      <strong style={{ display: "block" }}>{job.assignedFreelancer.displayName}</strong>
                      <span style={{ fontSize: 13, color: "#6B7280" }}>Assigned on {formatDate(job.assignedAt)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, padding: "10px", background: "#F9FAFB", borderRadius: 8, fontSize: 13 }}>
                    {job.assignedFreelancer.skills.slice(0, 3).join(", ")}
                  </div>
                </section>
              ) : job.status === "OPEN" ? (
                <section className="inline-panel">
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>Pending Assignment</h3>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Candidates will appear here after they apply or are invited.</p>
                  <Link href="/company/requests" className="button-secondary" style={{ width: "100%", textAlign: "center", display: "block" }}>Review Applications</Link>
                </section>
              ) : null}
            </aside>
          </div>
        )}

        {/* ── MILESTONES TAB ── */}
        {activeTab === "milestones" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <section className="inline-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Payment & Escrow Setup</h2>
                  <p className="muted" style={{ fontSize: 14 }}>Fund the project and define the payment release schedule.</p>
                </div>
                {job.status === "ASSIGNED" && (
                  <div style={{ background: "#EFF6FF", border: "1px solid #DBEAFE", padding: "12px 16px", borderRadius: 12 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: "#1E40AF", fontWeight: 600 }}>Action Required: Fund Escrow</p>
                    <div className="action-row" style={{ marginBottom: 0 }}>
                      <button className="button-secondary" disabled={!canCreateEscrowIntent || isCreatingIntent} onClick={handleCreateEscrowIntent}>
                        {isCreatingIntent ? "Preparing..." : "Setup Payment"}
                      </button>
                      <button className="button-primary" style={{ backgroundColor: companyAccent }} 
                              disabled={!canSimulateFunding || isSimulatingPayment} onClick={handleSimulateFunding}>
                        {isSimulatingPayment ? "Funding..." : "Confirm Funding"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {showMilestones ? (
                <MilestonePlanForm
                  disabled={!canEditMilestones} errorMessage={milestoneError}
                  isSubmitting={isSavingMilestones} milestones={milestoneValues}
                  onChange={updateMilestoneField} onSubmit={handleSaveMilestones} totalBudget={job.budget}
                  onApplyHalfSplit={job.milestoneCount === 2 && canEditMilestones ? () => setMilestoneValues(curr => applyHalfSplit(job.budget, curr)) : undefined}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "#F9FAFB", borderRadius: 16 }}>
                  <p style={{ color: "#6B7280" }}>Escrow must be fully funded before you can define the milestone schedule.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── REVIEW TAB ── */}
        {activeTab === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <section className="inline-panel">
              <h2 style={{ marginBottom: 8 }}>Deliverable Management</h2>
              <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>Approve submissions to release funds or request revisions.</p>
              
              {reviewError && <p className="form-error">{reviewError}</p>}
              
              <div className="card-stack">
                {job.milestones.length === 0 ? (
                  <p className="muted">No milestones defined yet.</p>
                ) : (
                  job.milestones.map((m) => {
                    const submission = m.latestSubmission;
                    const isActing = actingReviewMilestoneId === m.id;
                    
                    return (
                      <article key={m.id} className="list-card" style={{ 
                        borderLeft: `4px solid ${m.status === "RELEASED" ? "#059669" : m.status === "UNDER_REVIEW" ? companyAccent : "#E5E7EB"}`,
                        padding: 20
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: companyAccent, textTransform: "uppercase" }}>Milestone {m.sequence}</span>
                              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#F3F4F6", color: "#4B5563", fontWeight: 600 }}>{m.status}</span>
                            </div>
                            <h3 style={{ margin: "0 0 4px" }}>{m.title}</h3>
                            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>{formatCurrency(m.amount)} · Due {formatDate(m.dueAt)}</p>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            {m.status === "UNDER_REVIEW" && (
                              <div style={{ display: "flex", gap: 10 }}>
                                <button className="button-secondary" disabled={isActing} onClick={() => { /* scroll to reject section */ }}>Reject</button>
                                <button className="button-primary" style={{ backgroundColor: companyAccent }} disabled={isActing} 
                                        onClick={() => handleApproveMilestone(m.id)}>
                                  {isActing && reviewAction === "approve" ? "Releasing..." : "Approve & Pay"}
                                </button>
                              </div>
                            )}
                            {m.status === "RELEASED" && (
                              <span style={{ color: "#059669", fontWeight: 600, fontSize: 14 }}>✓ Funds Released</span>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: 20, padding: 16, background: "#F9FAFB", borderRadius: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Submission</span>
                            {submission ? (
                              <div>
                                <strong style={{ display: "block", fontSize: 14 }}>{submission.fileName}</strong>
                                <span style={{ fontSize: 12, color: "#6B7280" }}>{submission.fileFormat?.toUpperCase()} · Revision {submission.revision}</span>
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>No work submitted yet.</p>
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Review Deadline</span>
                            <strong style={{ display: "block", fontSize: 14 }}>{m.reviewDueAt ? formatDate(m.reviewDueAt) : "N/A"}</strong>
                            <span style={{ fontSize: 12, color: "#6B7280" }}>Auto-releases if not reviewed</span>
                          </div>
                        </div>

                        {m.status === "UNDER_REVIEW" && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #E5E7EB" }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Rejection Reason (only if rejecting)</label>
                            <textarea 
                              placeholder="Provide detailed feedback on what needs to be changed..."
                              style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
                              value={rejectReasons[m.id] ?? ""}
                              onChange={(e) =>
                                setRejectReasons((previous) => ({
                                  ...previous,
                                  [m.id]: e.target.value
                                }))
                              }
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                              <button className="button-secondary" style={{ color: "#DC2626", borderColor: "#DC2626" }} 
                                      disabled={isActing} onClick={() => handleRejectMilestone(m.id)}>
                                {isActing && reviewAction === "reject" ? "Processing..." : "Reject Submission"}
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </CompanyWorkspaceShell>
  );
};
