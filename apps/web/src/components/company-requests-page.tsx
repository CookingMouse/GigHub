"use client";

import React, { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CompanyJobApplicationRecord, CompanyJobInvitationRecord, WorkerRecommendationRecord, JobRecord, FreelancerDirectoryRecord } from "@gighub/shared";
import { ApiRequestError, jobsApi, requestsApi, freelancersApi, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      applications: CompanyJobApplicationRecord[];
      invitations: CompanyJobInvitationRecord[];
      recommendations: WorkerRecommendationRecord[];
      jobs: JobRecord[];
      allFreelancers: FreelancerDirectoryRecord[];
    }
  | { status: "error"; message: string };

const companyAccent = "#1D4ED8";

const getStatusColor = (status: string): { color: string; backgroundColor: string } => {
  const statusLower = status.toLowerCase();
  if (statusLower === "accepted" || statusLower === "approved") return { color: "#059669", backgroundColor: "#ECFDF5" };
  if (statusLower === "rejected" || statusLower === "denied" || statusLower === "cancelled") return { color: "#DC2626", backgroundColor: "#FEF2F2" };
  if (statusLower === "pending") return { color: "#D97706", backgroundColor: "#FFFBEB" };
  return { color: "#6B7280", backgroundColor: "#F3F4F6" };
};

const toSentenceCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const CompanyRequestsPage = () => {
  const session = useProtectedUser("company");
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freelancerSearchQuery, setFreelancerSearchQuery] = useState("");
  
  // Invitation Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<{id: string, name: string} | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [inviteNote, setInviteNote] = useState("");

  const reload = async () => {
    try {
      const [requests, recommendations, jobs, freelancers] = await Promise.all([
        requestsApi.listCompanyRequests(),
        requestsApi.listWorkerRecommendations(),
        jobsApi.list(),
        freelancersApi.list()
      ]);

      setState({
        status: "ready",
        applications: requests.applications,
        invitations: requests.invitations,
        recommendations: recommendations.recommendations,
        jobs: jobs.jobs.filter(j => j.status === "OPEN"),
        allFreelancers: freelancers.freelancers
      });
    } catch (loadError) {
      setState({
        status: "error",
        message: loadError instanceof ApiRequestError ? loadError.message : "Unable to load requests."
      });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void reload();
    }
  }, [session.status]);

  const filteredFreelancers = useMemo(() => {
    if (state.status !== "ready") return [];
    if (!freelancerSearchQuery.trim()) return [];
    
    return state.allFreelancers.filter(f => {
      const q = freelancerSearchQuery.toLowerCase();
      return (f.displayName || "").toLowerCase().includes(q) || 
             (f.skills || []).some(s => s.toLowerCase().includes(q));
    }).slice(0, 5);
  }, [state, freelancerSearchQuery]);

  const handleInvite = () => {
    if (!selectedFreelancer || !selectedJobId) return;
    
    setBusyId(`invite-${selectedFreelancer.id}`);
    setError(null);
    startTransition(async () => {
      try {
        await requestsApi.inviteFreelancer(selectedJobId, { 
          freelancerId: selectedFreelancer.id, 
          note: inviteNote 
        });
        setShowInviteModal(false);
        setInviteNote("");
        setSelectedFreelancer(null);
        setFreelancerSearchQuery("");
        await reload();
      } catch (inviteError) {
        setError(inviteError instanceof ApiRequestError ? inviteError.message : "Unable to invite.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const resolveApplication = (applicationId: string, action: "accept" | "reject") => {
    setBusyId(applicationId);
    setError(null);
    startTransition(async () => {
      try {
        await requestsApi.resolveApplication(applicationId, action);
        await reload();
      } catch (resolveError) {
        setError(resolveError instanceof ApiRequestError ? resolveError.message : "Unable to resolve.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const openInviteModal = (freelancerId: string, freelancerName: string) => {
    setSelectedFreelancer({ id: freelancerId, name: freelancerName });
    setShowInviteModal(true);
  };

  const handleDownloadResume = async (freelancerId: string) => {
    setError(null);
    try {
      const { blob, fileName } = await profileApi.downloadFreelancerResume(freelancerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement("a"));
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setError("This freelancer has not uploaded a resume yet.");
      } else {
        setError(err instanceof ApiRequestError ? err.message : "Unable to download resume.");
      }
    }
  };

  if (session.status !== "ready") return null;

  return (
    <WorkspaceLayout
      title="Job Request"
      subtitle="Manage freelancer applications and GLM-powered worker recommendations."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {state.status === "loading" && <p className="muted">Loading requests and recommendations...</p>}
      {state.status === "error" && <p className="form-error">{state.message}</p>}

      {state.status === "ready" && (
        <div className="workspace-grid freelancer-requests-layout">
          {/* Column 1: Self Requested (Applications & Sent Invitations) */}
          <section className="inline-panel">
            <p className="freelancer-requests-section-label">Manual Management</p>
            <h2 className="freelancer-requests-section-title">Self Requested</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Search for People Bar */}
              <div style={{ padding: "16px", background: "#F9FAFB", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>FIND FREELANCERS</p>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    placeholder="Search by name or skill (e.g. Figma)..."
                    value={freelancerSearchQuery}
                    onChange={(e) => setFreelancerSearchQuery(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px"
                    }}
                  />
                  {filteredFreelancers.length > 0 && (
                    <div style={{ 
                      position: "absolute", top: "100%", left: 0, right: 0, 
                      background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, marginTop: "4px",
                      overflow: "hidden"
                    }}>
                      {filteredFreelancers.map(f => (
                        <div 
                          key={f.id} 
                          style={{ 
                            padding: "10px 12px", borderBottom: "1px solid #F3F4F6", 
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                          <Link href={`/freelancers/${f.id}`} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
                            <span style={{ fontWeight: 600, fontSize: "14px", display: "block" }}>{f.displayName}</span>
                            <span style={{ fontSize: "11px", color: "#6B7280" }}>{f.skills.slice(0, 3).join(", ")}</span>
                          </Link>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <Link href={`/freelancers/${f.id}`} style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                              Profile
                            </Link>
                            {f.hasResume ? (
                              <span
                                onClick={() => handleDownloadResume(f.id)}
                                style={{ fontSize: "12px", color: "#0F6E56", fontWeight: 500, cursor: "pointer" }}
                              >
                                📄 Resume
                              </span>
                            ) : null}
                            <span
                              onClick={() => openInviteModal(f.id, f.displayName)}
                              style={{ fontSize: "12px", color: companyAccent, fontWeight: 500, cursor: "pointer" }}
                            >
                              Invite →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#6B7280", marginBottom: 12, letterSpacing: "0.05em" }}>Inbound Applications</h3>
                <div className="card-stack">
                  {state.applications.length === 0 ? (
                    <p className="muted" style={{ fontSize: 14 }}>No applications received yet.</p>
                  ) : (
                    state.applications.map((app) => (
                      <article className="status-panel" key={app.id} style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong style={{ display: "block", fontSize: 15 }}>{app.freelancerDisplayName}</strong>
                            <p className="muted" style={{ fontSize: 13, margin: "2px 0 8px" }}>Applied for {app.jobTitle}</p>
                          </div>
                          <span style={{ 
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            ...getStatusColor(app.status)
                          }}>
                            {toSentenceCase(app.status)}
                          </span>
                        </div>
                        <div className="action-row" style={{ marginTop: 12 }}>
                          <button
                            className="button-secondary"
                            type="button"
                            onClick={() => handleDownloadResume(app.freelancerId)}
                            style={{ fontSize: 13 }}
                          >
                            📄 Download Resume
                          </button>
                          {app.status === "PENDING" && (
                            <>
                              <button
                                className="button-primary"
                                style={{ backgroundColor: companyAccent }}
                                disabled={busyId !== null}
                                onClick={() => resolveApplication(app.id, "accept")}
                              >
                                {busyId === app.id ? "Processing..." : "Accept"}
                              </button>
                              <button
                                className="button-secondary"
                                disabled={busyId !== null}
                                onClick={() => resolveApplication(app.id, "reject")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#6B7280", marginBottom: 12, letterSpacing: "0.05em" }}>Sent Invitations</h3>
                <div className="card-stack">
                  {state.invitations.length === 0 ? (
                    <p className="muted" style={{ fontSize: 14 }}>No invitations sent yet.</p>
                  ) : (
                    state.invitations.map((inv) => (
                      <article className="status-panel" key={inv.id} style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong style={{ display: "block", fontSize: 14 }}>{inv.jobTitle}</strong>
                            <p className="muted" style={{ fontSize: 13, margin: "2px 0" }}>To: {inv.freelancerName}</p>
                          </div>
                          <span style={{ 
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            ...getStatusColor(inv.status)
                          }}>
                            {toSentenceCase(inv.status)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Column 2: GLM Recommendations */}
          <section className="inline-panel" style={{ borderLeft: "1px solid #E5E7EB", paddingLeft: 24 }}>
            <p className="freelancer-requests-section-label">AI Matching</p>
            <h2 className="freelancer-requests-section-title">GLM Recommendations</h2>
            
            <div style={{ maxHeight: "600px", overflowY: "auto", paddingRight: "10px" }}>
              <div className="card-stack">
                {state.recommendations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "#F9FAFB", borderRadius: 16 }}>
                    <p className="muted">No recommendations available.</p>
                    <p style={{ fontSize: 12, marginTop: 8 }}>GLM analyzes your open jobs to find the best talent match.</p>
                  </div>
                ) : (
                  state.recommendations.map((rec) => (
                    <article className="status-panel" key={rec.freelancerId} style={{ padding: 20, border: "1px solid #E5E7EB", position: "relative" }}>
                      <div style={{ position: "absolute", top: 16, right: 16, textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: companyAccent }}>{rec.matchScore}%</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" }}>Match Score</div>
                      </div>
                      
                      <div style={{ paddingRight: 60 }}>
                        <strong style={{ fontSize: 16, display: "block" }}>{rec.displayName}</strong>
                        <p style={{ color: companyAccent, fontSize: 13, fontWeight: 500, margin: "2px 0 8px" }}>{rec.headline || "Professional Freelancer"}</p>
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {(rec.skills || []).slice(0, 4).map(skill => (
                            <span key={skill} style={{ fontSize: 11, background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 4 }}>
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div style={{ background: "#F0FDF4", padding: "10px 12px", borderRadius: 10, marginBottom: 16, border: "1px solid #DCFCE7" }}>
                          <p style={{ fontSize: 12, color: "#166534", margin: 0, fontWeight: 600 }}>Why this match?</p>
                          <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: 12, color: "#166534" }}>
                            {(rec.reasons || []).map((reason, i) => <li key={i}>{reason}</li>)}
                          </ul>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>Matched for: <strong>{rec.bestMatchJobTitle}</strong></span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="button-secondary"
                              type="button"
                              style={{ padding: "6px 12px", height: "auto", fontSize: 13 }}
                              onClick={() => handleDownloadResume(rec.freelancerId)}
                            >
                              📄 Resume
                            </button>
                            <button
                              className="button-primary"
                              style={{ backgroundColor: companyAccent, padding: "6px 16px", height: "auto", fontSize: 13 }}
                              onClick={() => openInviteModal(rec.freelancerId, rec.displayName)}
                            >
                              Send Request
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Invitation Modal */}
      {showInviteModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div className="shell-card" style={{ width: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Invite {selectedFreelancer?.name}</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: "#9CA3AF" }}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label className="field">
                <span>Select Job to Invite For</span>
                <select 
                  style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #E5E7EB" }}
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="">Select a job...</option>
                  {state.status === "ready" && state.jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Personalized Message (Optional)</span>
                <textarea 
                  placeholder="Tell the freelancer why you want to work with them..."
                  style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #E5E7EB", minHeight: 100 }}
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                />
              </label>

              <div className="action-row" style={{ marginTop: 8 }}>
                <button 
                  className="button-primary" 
                  style={{ width: "100%", backgroundColor: companyAccent }}
                  disabled={!selectedJobId || busyId !== null}
                  onClick={handleInvite}
                >
                  {busyId?.startsWith("invite-") ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
