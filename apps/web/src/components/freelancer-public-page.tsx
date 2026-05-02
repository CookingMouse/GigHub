"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApiRequestError, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type FreelancerPublicPageProps = {
  freelancerId: string;
};

const freelancerAccent = "#0F6E56";

export const FreelancerPublicPage = ({ freelancerId }: FreelancerPublicPageProps) => {
  const session = useProtectedUser();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; profile: Awaited<ReturnType<typeof profileApi.getPublicFreelancerProfile>>["profile"] }
  >({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await profileApi.getPublicFreelancerProfile(freelancerId);
        setState({
          status: "ready",
          profile: response.profile
        });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof ApiRequestError ? error.message : "Unable to load freelancer profile."
        });
      }
    };

    void load();
  }, [freelancerId, session.status]);

  if (session.status !== "ready") {
    return null;
  }

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <WorkspaceLayout
      title="Freelancer Profile"
      subtitle="Public profile details for company review."
      user={session.user}
    >
      {state.status === "loading" ? <p className="muted">Loading freelancer profile...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}
      
      {state.status === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Professional Header Section */}
          <section className="inline-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 160, background: `linear-gradient(135deg, ${freelancerAccent}, #10B981)` }} />
            <div style={{ padding: "0 24px 32px", marginTop: -60, position: "relative" }}>
              <div style={{ 
                width: 120, height: 120, borderRadius: 24, background: "#fff", 
                border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 40, fontWeight: 700, color: freelancerAccent,
                marginBottom: 16
              }}>
                {getInitials(state.profile.displayName)}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-0.5px" }}>{state.profile.displayName}</h1>
                  <p style={{ margin: "4px 0 12px", fontSize: 18, color: "#4B5563", fontWeight: 500 }}>{state.profile.headline || "Independent Freelancer"}</p>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "#6B7280" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>{state.profile.experienceYears ? `${state.profile.experienceYears} Years Experience` : "Verified Freelancer"}</span>
                    </div>
                    {state.profile.portfolioUrl && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <a href={state.profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ color: freelancerAccent, fontWeight: 500 }}>
                          Portfolio Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                {session.user.role === "company" && (
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="button-primary" style={{ backgroundColor: freelancerAccent, padding: "10px 24px" }}>
                      Follow
                    </button>
                    <Link href="/company/requests" className="button-secondary" style={{ padding: "10px 24px" }}>
                      Send Job Invitation
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="workspace-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 32 }}>
            {/* Main Content: Bio and Skills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid #F3F4F6", paddingBottom: 12 }}>About</h2>
                <div style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, whiteSpace: "pre-wrap" }}>
                  {state.profile.bio || "No biography provided yet."}
                </div>
              </section>

              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid #F3F4F6", paddingBottom: 12 }}>Skills & Expertise</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {state.profile.skills.length > 0 ? (
                    state.profile.skills.map((skill: string) => (
                      <span key={skill} style={{ 
                        padding: "6px 16px", borderRadius: 99, background: "#F3F4F6", 
                        fontSize: 14, fontWeight: 500, color: "#374151"
                      }}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="muted">No skills listed.</p>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar: Quick Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Performance</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>Jobs Completed</span>
                    <strong style={{ fontSize: 15 }}>Verified</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>On-time Delivery</span>
                    <strong style={{ fontSize: 15, color: "#059669" }}>98%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>Freelancer Rating</span>
                    <strong style={{ fontSize: 15, color: "#D97706" }}>★★★★★ 4.9</strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
