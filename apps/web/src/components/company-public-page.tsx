"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApiRequestError, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type CompanyPublicPageProps = {
  companyId: string;
};

const companyAccent = "#1D4ED8";

export const CompanyPublicPage = ({ companyId }: CompanyPublicPageProps) => {
  const session = useProtectedUser();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; company: Awaited<ReturnType<typeof profileApi.getPublicCompanyProfile>>["company"] }
  >({ status: "loading" });

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

    const load = async () => {
      try {
        const response = await profileApi.getPublicCompanyProfile(companyId);
        setState({
          status: "ready",
          company: response.company
        });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof ApiRequestError ? error.message : "Unable to load company profile."
        });
      }
    };

    void load();
  }, [companyId, session.status]);

  if (session.status !== "ready") {
    return null;
  }

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <WorkspaceLayout
      title="Company Page"
      subtitle="Public profile for company review and self-requesting work."
      user={session.user}
    >
      {state.status === "loading" ? <p className="muted">Loading company profile...</p> : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}
      
      {state.status === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Professional Header Section */}
          <section className="inline-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 160, background: `linear-gradient(135deg, ${companyAccent}, #3B82F6)` }} />
            <div style={{ padding: "0 24px 32px", marginTop: -60, position: "relative" }}>
              <div style={{ 
                width: 120, height: 120, borderRadius: 24, background: "#fff", 
                border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 40, fontWeight: 700, color: companyAccent,
                marginBottom: 16
              }}>
                {getInitials(state.company.companyName)}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-0.5px" }}>{state.company.companyName}</h1>
                  <p style={{ margin: "4px 0 12px", fontSize: 18, color: "#4B5563", fontWeight: 500 }}>{state.company.industry || "Industry not specified"}</p>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "#6B7280" }}>
                    {state.company.website && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <a href={state.company.website} target="_blank" rel="noopener noreferrer" style={{ color: companyAccent, fontWeight: 500 }}>
                          {state.company.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>Remote First</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="button-primary" style={{ backgroundColor: companyAccent, padding: "10px 24px" }}>
                    Follow
                  </button>
                  <button className="button-secondary" style={{ padding: "10px 24px" }}>
                    Contact for Work
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="workspace-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 32 }}>
            {/* Main Content: About */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid #F3F4F6", paddingBottom: 12 }}>About</h2>
                <div style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, whiteSpace: "pre-wrap" }}>
                  {state.company.about || "This company hasn't provided an overview yet."}
                </div>
              </section>

              {/* Company Culture / Highlights Placeholder */}
              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid #F3F4F6", paddingBottom: 12 }}>Work Highlights</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ padding: 16, background: "#F9FAFB", borderRadius: 12 }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Verified Payments</h3>
                    <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Consistent track record of releasing milestone payments on time.</p>
                  </div>
                  <div style={{ padding: 16, background: "#F9FAFB", borderRadius: 12 }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Clear Scoping</h3>
                    <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Utilizes GigHub's GLM for high-quality, transparent job briefs.</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar: Stats and Jobs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Company Insights</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>Active Jobs</span>
                    <strong style={{ fontSize: 15 }}>Multiple</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>Avg. Response Time</span>
                    <strong style={{ fontSize: 15 }}>24-48h</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#6B7280", fontSize: 14 }}>Freelancer Rating</span>
                    <strong style={{ fontSize: 15, color: "#D97706" }}>★★★★★ 5.0</strong>
                  </div>
                </div>
              </section>

              <section className="inline-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Open Roles</h2>
                <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Browse through currently available opportunities with {state.company.companyName}.</p>
                <Link href="/freelancer/browse-jobs" className="button-secondary" style={{ width: "100%", textAlign: "center", display: "block" }}>
                  View All Open Jobs
                </Link>
              </section>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};
